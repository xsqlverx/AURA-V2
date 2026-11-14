"""Unit tests for audio input device selection and persistence."""

import unittest
from unittest.mock import patch
from voice import audio_device


class AudioDeviceTests(unittest.TestCase):
    def setUp(self):
        # Save original state
        self._orig_id = audio_device.get_selected_device_id()
        self._orig_name = audio_device.get_selected_device_name()

    def tearDown(self):
        # Restore original state
        audio_device.set_selected_device(self._orig_id, self._orig_name)

    def test_list_input_devices(self):
        devices = audio_device.list_input_devices()
        self.assertIsInstance(devices, list)
        if devices:
            dev = devices[0]
            self.assertIn("id", dev)
            self.assertIn("name", dev)
            self.assertIn("hostapi", dev)
            self.assertIn("channels", dev)
            self.assertIn("is_system_default", dev)
            self.assertIn("is_selected", dev)
            self.assertGreater(dev["channels"], 0)

    def test_select_and_reset_device(self):
        devices = audio_device.list_input_devices()
        if not devices:
            self.skipTest("No audio input devices found on system")

        target_dev = devices[0]
        listener_called = []

        def on_change(dev_id, dev_name):
            listener_called.append((dev_id, dev_name))

        audio_device.register_device_change_listener(on_change)

        # Select first device
        res = audio_device.set_selected_device(target_dev["id"], target_dev["name"])
        self.assertTrue(res["success"])
        self.assertEqual(audio_device.get_selected_device_id(), target_dev["id"])
        self.assertEqual(audio_device.get_selected_device_name(), target_dev["name"])
        self.assertTrue(len(listener_called) > 0)
        self.assertEqual(listener_called[-1], (target_dev["id"], target_dev["name"]))

        # Reset to system default
        res_reset = audio_device.set_selected_device(None)
        self.assertTrue(res_reset["success"])
        self.assertIsNone(audio_device.get_selected_device_id())
        self.assertIsNone(audio_device.get_selected_device_name())

    def test_test_microphone_runs(self):
        # Run a short 0.2s test to confirm audio pipeline executes cleanly
        res = audio_device.test_microphone(duration=0.2)
        self.assertIsInstance(res, dict)
        self.assertIn("success", res)
        self.assertIn("peak", res)
        self.assertIn("rms", res)
        self.assertIn("message", res)

    def test_tts_stream_auto_recovery(self):
        from voice.tts import create_engine
        engine = create_engine("edge", "en-US-AvaNeural")
        try:
            self.assertTrue(engine._is_stream_alive())
            # Simulate a broken/closed stream
            if engine._stream:
                engine._stream.close(ignore_errors=True)
            self.assertFalse(engine._is_stream_alive())
            # speak() should automatically revive the stream
            engine.speak("Recovery test")
            self.assertTrue(engine._is_stream_alive())
        finally:
            engine.stop()

    def test_server_tts_lazy_init(self):
        from core.server import _get_or_init_tts
        tts = _get_or_init_tts()
        self.assertIsNotNone(tts)


if __name__ == "__main__":
    unittest.main()
