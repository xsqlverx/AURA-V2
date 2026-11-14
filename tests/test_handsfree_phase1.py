"""Unit tests for Phase 1: Hands-Free Controller, Phrase Matcher, and System Launcher."""

import unittest
from unittest.mock import patch, MagicMock

from core.handsfree import (
    HandsFreeController,
    HandsFreeResult,
    match_handsfree_phrase,
)
from tools.system import launch_app


class TestHandsFreeController(unittest.TestCase):
    def setUp(self):
        self.ctrl = HandsFreeController()

    def test_initial_state(self):
        snap = self.ctrl.snapshot()
        self.assertFalse(snap["enabled"])
        self.assertEqual(snap["activity"], "idle")
        self.assertEqual(snap["mic_status"], "ready")
        self.assertEqual(snap["generation"], 0)
        self.assertFalse(self.ctrl.flow_event.is_set())

    def test_idempotent_enable(self):
        # First enable
        self.assertTrue(self.ctrl.enable(source="test", request_id="req1"))
        self.assertTrue(self.ctrl.enabled)
        self.assertEqual(self.ctrl.generation, 1)
        self.assertTrue(self.ctrl.flow_event.is_set())
        session1 = self.ctrl.session_id

        # Repeated enable with same request_id
        self.assertTrue(self.ctrl.enable(source="test", request_id="req1"))
        self.assertTrue(self.ctrl.enabled)
        self.assertEqual(self.ctrl.session_id, session1)
        self.assertEqual(self.ctrl.generation, 1)

        # Repeated enable without request_id is also idempotent
        self.assertTrue(self.ctrl.enable(source="test"))
        self.assertTrue(self.ctrl.enabled)
        self.assertEqual(self.ctrl.session_id, session1)

    def test_idempotent_disable(self):
        self.ctrl.enable(source="test")
        gen_before = self.ctrl.generation
        self.assertTrue(self.ctrl.enabled)

        # First disable
        self.assertFalse(self.ctrl.disable(reason="test_disable"))
        self.assertFalse(self.ctrl.enabled)
        self.assertEqual(self.ctrl.generation, gen_before + 1)
        self.assertFalse(self.ctrl.flow_event.is_set())

        # Repeated disable
        self.assertFalse(self.ctrl.disable(reason="test_disable_again"))
        self.assertFalse(self.ctrl.enabled)
        # Generation does not needlessly advance when already disabled
        self.assertEqual(self.ctrl.generation, gen_before + 1)

    def test_toggle(self):
        self.assertFalse(self.ctrl.enabled)
        self.assertTrue(self.ctrl.toggle())
        self.assertTrue(self.ctrl.enabled)
        self.assertFalse(self.ctrl.toggle())
        self.assertFalse(self.ctrl.enabled)

    def test_generation_invalidation(self):
        self.ctrl.enable(source="test")
        sid = self.ctrl.session_id
        gen = self.ctrl.generation

        self.assertTrue(self.ctrl.is_valid(sid, gen))

        # Cancel current command advances generation
        self.ctrl.cancel_current(reason="user_stop")
        new_gen = self.ctrl.generation
        self.assertGreater(new_gen, gen)
        self.assertFalse(self.ctrl.is_valid(sid, gen))
        self.assertTrue(self.ctrl.is_valid(sid, new_gen))

        # Disabling invalidates everything
        self.ctrl.disable(reason="test_stop")
        self.assertFalse(self.ctrl.is_valid(sid, new_gen))

    def test_listener_notification(self):
        events = []
        listener = lambda snap: events.append(snap)
        self.ctrl.register_listener(listener)

        self.ctrl.enable(source="test_notif")
        self.assertGreater(len(events), 0)
        self.assertTrue(events[-1]["enabled"])

        self.ctrl.set_activity("executing", detail="testing detail")
        self.assertEqual(events[-1]["activity"], "executing")
        self.assertEqual(events[-1]["detail"], "testing detail")

        self.ctrl.unregister_listener(listener)
        count = len(events)
        self.ctrl.disable()
        self.assertEqual(len(events), count)  # no new events received


class TestHandsFreePhraseMatcher(unittest.TestCase):
    def test_positive_enable_phrases(self):
        cases = [
            "activate hands-free mode",
            "activate handsfree mode",
            "Aura, activate hands-free mode",
            "turn on hands-free",
            "enable hands-free mode",
            "hands-free mode on",
            "hands-free on",
        ]
        for c in cases:
            res = match_handsfree_phrase(c)
            self.assertIsNotNone(res, f"Failed on: {c}")
            self.assertEqual(res["intent"], "enable", f"Wrong intent for: {c}")

    def test_positive_disable_phrases(self):
        cases = [
            "disable hands-free mode",
            "deactivate hands-free mode",
            "turn off hands-free mode",
            "hands-free mode off",
            "hands-free mode turned off",
            "hands-free off",
            "aura, turn off handsfree",
        ]
        for c in cases:
            res = match_handsfree_phrase(c)
            self.assertIsNotNone(res, f"Failed on: {c}")
            self.assertEqual(res["intent"], "disable", f"Wrong intent for: {c}")

    def test_positive_stop_phrases(self):
        cases = [
            "stop",
            "cancel",
            "stop that",
            "aura, stop that",
            "abort",
        ]
        for c in cases:
            res = match_handsfree_phrase(c)
            self.assertIsNotNone(res, f"Failed on: {c}")
            self.assertEqual(res["intent"], "stop", f"Wrong intent for: {c}")

        # Stop reading
        res = match_handsfree_phrase("stop reading")
        self.assertIsNotNone(res)
        self.assertEqual(res["intent"], "stop_reading")

    def test_positive_dictation_phrases(self):
        res1 = match_handsfree_phrase("start dictation")
        self.assertIsNotNone(res1)
        self.assertEqual(res1["intent"], "start_dictation")

        res2 = match_handsfree_phrase("stop dictation")
        self.assertIsNotNone(res2)
        self.assertEqual(res2["intent"], "stop_dictation")

    def test_safeguards_negations_and_questions(self):
        negatives = [
            "don't activate hands-free mode",
            "do not turn on hands-free",
            "what does hands-free mean?",
            "what is hands-free mode?",
            "can you explain hands-free mode?",
            "should I turn off hands-free?",
        ]
        for c in negatives:
            res = match_handsfree_phrase(c)
            self.assertIsNone(res, f"Safeguard failed, incorrectly matched: {c}")

    def test_safeguards_literal_typing(self):
        literal_payloads = [
            "type turn off hands-free mode",
            "type hands-free mode turned off",
            "write disable hands-free mode",
            "say stop that",
            "input activate hands-free mode",
        ]
        for c in literal_payloads:
            res = match_handsfree_phrase(c)
            self.assertIsNone(res, f"Literal typing safeguard failed on: {c}")


class TestStructuredResult(unittest.TestCase):
    def test_result_schema(self):
        res = HandsFreeResult(
            command_id="cmd_001",
            session_id="sess_abc",
            status="success",
            action="launch_app",
            target_summary="Notepad",
            verification="Window visible",
        )
        d = res.to_dict()
        self.assertEqual(d["command_id"], "cmd_001")
        self.assertEqual(d["session_id"], "sess_abc")
        self.assertEqual(d["status"], "success")
        self.assertEqual(d["action"], "launch_app")
        self.assertEqual(d["target_summary"], "Notepad")
        self.assertEqual(d["verification"], "Window visible")


class TestSystemLaunchAppFix(unittest.TestCase):
    @patch("tools.system.os.startfile")
    def test_launch_app_uri_does_not_crash(self, mock_startfile):
        # Prior to the fix, launching a URL or URI raised UnboundLocalError for 'resolved'
        result = launch_app("https://www.google.com")
        mock_startfile.assert_called_once_with("https://www.google.com")
        self.assertTrue(result.get("success"))
        self.assertEqual(result.get("launched"), "https://www.google.com")


class TestDeterministicCommandParser(unittest.TestCase):
    def test_direct_typing(self):
        from core.command_parser import parse_command

        cases = [
            ("type hello world", "hello world"),
            ("type I am Aura, and I am doing a test right now.", "I am Aura, and I am doing a test right now."),
            ("can you type Please verify this sentence, exactly as dictated.", "Please verify this sentence, exactly as dictated."),
            ("please type a sentence: testing 1, 2, 3!", "testing 1, 2, 3!"),
            ("aura, type hello", "hello"),
        ]
        for query, expected_text in cases:
            res = parse_command(query)
            self.assertIsNotNone(res, f"Failed on: {query}")
            action, args = res
            self.assertEqual(action, "type_text", f"Action mismatch on: {query}")
            self.assertEqual(args["text"], expected_text, f"Text mismatch on: {query}")

    def test_compound_launch_and_type(self):
        from core.command_parser import parse_command

        cases = [
            (
                "open notepad and type I am Aura, and I am doing a test right now.",
                "notepad",
                "I am Aura, and I am doing a test right now.",
            ),
            (
                "open notepad, type hello world",
                "notepad",
                "hello world",
            ),
            (
                "can you launch notepad and type Testing compound commands!",
                "notepad",
                "Testing compound commands!",
            ),
        ]
        for query, expected_app, expected_text in cases:
            res = parse_command(query)
            self.assertIsNotNone(res, f"Failed on: {query}")
            action, args = res
            self.assertEqual(action, "launch_and_type", f"Action mismatch on: {query}")
            self.assertEqual(args["app_name"].lower(), expected_app.lower())
            self.assertEqual(args["text"], expected_text)

    def test_drafting_intent_delegates_to_llm(self):
        from core.command_parser import parse_command

        # These should NOT be direct typed — they must return None so they flow to LLM
        drafting_prompts = [
            "draft an email to Alex saying I will be late",
            "write a reply to Alex",
            "compose a response to this message",
            "draft a letter of resignation",
            "help me write an essay on artificial intelligence",
            "write a review of this laptop",
            "write an email to my manager",
            "draft a message explaining the delay",
        ]
        for prompt in drafting_prompts:
            res = parse_command(prompt)
            self.assertIsNone(res, f"Drafting prompt incorrectly intercepted as direct type: {prompt}")


class TestEchoSuppression(unittest.TestCase):
    def test_detects_recent_tts_echo(self):
        from voice.tts import record_spoken_text, is_recent_tts_echo

        record_spoken_text("Hands-free mode active. I'm listening.")

        # Full echo
        self.assertTrue(is_recent_tts_echo("Hands-free mode active. I'm listening."))
        # Partial echo
        self.assertTrue(is_recent_tts_echo("I'm listening."))
        self.assertTrue(is_recent_tts_echo("hands-free mode active"))

        # Unrelated user command must NOT be treated as echo
        self.assertFalse(is_recent_tts_echo("open notepad and type hello"))
        self.assertFalse(is_recent_tts_echo("can you open youtube"))


class TestWhisperNoiseAndHallucinationFilter(unittest.TestCase):
    def test_silence_and_hallucinations_dropped(self):
        from voice.pipeline import is_noise_or_hallucination

        # Silence, breath, punctuation
        self.assertTrue(is_noise_or_hallucination(""))
        self.assertTrue(is_noise_or_hallucination("   "))
        self.assertTrue(is_noise_or_hallucination("."))
        self.assertTrue(is_noise_or_hallucination(".."))
        self.assertTrue(is_noise_or_hallucination("..."))
        self.assertTrue(is_noise_or_hallucination("!"))
        self.assertTrue(is_noise_or_hallucination("?"))
        self.assertTrue(is_noise_or_hallucination("a"))  # single char alnum

        # Common Whisper silence hallucinations
        self.assertTrue(is_noise_or_hallucination("Thank you."))
        self.assertTrue(is_noise_or_hallucination("Thank you"))
        self.assertTrue(is_noise_or_hallucination("Thanks."))
        self.assertTrue(is_noise_or_hallucination("Thanks"))
        self.assertTrue(is_noise_or_hallucination("thank you so much."))
        self.assertTrue(is_noise_or_hallucination("you."))
        self.assertTrue(is_noise_or_hallucination("you"))
        self.assertTrue(is_noise_or_hallucination("subtitles by opensubtitles"))
        self.assertTrue(is_noise_or_hallucination("Please subscribe!"))

        # Legitimate commands MUST NOT be dropped
        self.assertFalse(is_noise_or_hallucination("open youtube"))
        self.assertFalse(is_noise_or_hallucination("close notepad"))
        self.assertFalse(is_noise_or_hallucination("type hello world"))
        self.assertFalse(is_noise_or_hallucination("can you set a timer for 5 minutes"))


class TestFastpathEdgeCases(unittest.IsolatedAsyncioTestCase):
    async def test_fastpath_casual_prefixes(self):
        from core.fastpath import try_fastpath

        # "Aura can you just open YouTube" -> open_website youtube
        res = await try_fastpath("Aura can you just open YouTube")
        self.assertIsNotNone(res, "Failed on: Aura can you just open YouTube")
        tool, args = res
        self.assertEqual(tool, "open_website")
        self.assertEqual(args["url"], "https://www.youtube.com")

        # "or a close youtube" -> close_app youtube
        res = await try_fastpath("or a close youtube")
        self.assertIsNotNone(res, "Failed on: or a close youtube")
        tool, args = res
        self.assertEqual(tool, "close_app")
        self.assertEqual(args["app_name"], "youtube")

        # "can you please launch notepad" -> launch_app notepad
        res = await try_fastpath("can you please launch notepad")
        self.assertIsNotNone(res)
        tool, args = res
        self.assertEqual(tool, "launch_app")
        self.assertEqual(args["app_name"], "notepad")

        # "ora open notepad" -> launch_app notepad
        res = await try_fastpath("ora open notepad")
        self.assertIsNotNone(res)
        tool, args = res
        self.assertEqual(tool, "launch_app")
        self.assertEqual(args["app_name"], "notepad")

        # "close chrome" -> close_app chrome
        res = await try_fastpath("close chrome")
        self.assertIsNotNone(res)
        tool, args = res
        self.assertEqual(tool, "close_app")
        self.assertEqual(args["app_name"], "chrome")

    async def test_fastpath_compound_skips(self):
        from core.fastpath import try_fastpath

        # True multi-action compound commands should return None to let LLM handle
        res = await try_fastpath("open chrome and search for dogs")
        self.assertIsNone(res)


class TestCommandParserCasualPrefixes(unittest.TestCase):
    def test_direct_typing_with_casual_prefixes(self):
        from core.command_parser import parse_command

        res = parse_command("or a type hello world")
        self.assertIsNotNone(res)
        self.assertEqual(res, ("type_text", {"text": "hello world"}))

        res = parse_command("aura can you just type this sentence: testing 1, 2, 3!")
        self.assertIsNotNone(res)
        self.assertEqual(res, ("type_text", {"text": "testing 1, 2, 3!"}))

        res = parse_command("or a open notepad and type hello world")
        self.assertIsNotNone(res)
        action, args = res
        self.assertEqual(action, "launch_and_type")
        self.assertEqual(args["app_name"].lower(), "notepad")
        self.assertEqual(args["text"], "hello world")


class TestPersonaConvo(unittest.TestCase):
    def test_no_false_refusals_in_persona(self):
        from core.agent import AURA_PERSONA_CONVO

        convo_lower = AURA_PERSONA_CONVO.lower()
        self.assertNotIn("no access to tools", convo_lower)
        self.assertNotIn("cannot control", convo_lower)
        self.assertNotIn("purely a conversational partner", convo_lower)


class TestCloseAppTool(unittest.TestCase):
    @patch("pyautogui.hotkey")
    def test_close_youtube_triggers_tab_close(self, mock_hotkey):
        from tools.system import close_app

        res = close_app("youtube")
        mock_hotkey.assert_called_once_with("ctrl", "w")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("action"), "closed_tab")


if __name__ == "__main__":
    unittest.main()

