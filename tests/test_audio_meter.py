"""Audio telemetry regression checks; no real microphone, playback, or models."""
import importlib
import queue
import threading
import time
import unittest
from unittest.mock import patch

import numpy as np

from voice.audio_meter import AudioMeter
from voice.audio_utils import generate_amplitude_payload


class MeterTests(unittest.TestCase):
    def setUp(self):
        self.meter = AudioMeter(1)
        self.messages = []
        self.meter._send = self.messages.append

    def test_rms_is_four_temporal_windows(self):
        pcm = np.repeat(np.array([0.0, 0.05, 0.1, 0.2], dtype=np.float32), 100)
        self.assertEqual(generate_amplitude_payload(pcm), 'AMPLITUDE:0.0,0.2,0.4,0.8')
        self.assertEqual(generate_amplitude_payload(np.array([np.nan, np.inf, -np.inf, 0.])), 'AMPLITUDE:0.0,0.0,0.0,0.0')

    def test_int16_mic_and_float_playback_normalize_equally(self):
        self.meter.submit('mic', np.full(1280, 4096, dtype=np.int16))
        self.meter.submit('tts', np.full(1024, 0.125, dtype=np.float32))
        self.meter._tick(time.monotonic())
        self.assertEqual(self.messages, ['AMPLITUDE:mic:0.5,0.5,0.5,0.5', 'AMPLITUDE:tts:0.5,0.5,0.5,0.5'])

    def test_source_silence_does_not_cancel_other_speaker(self):
        self.meter.submit('mic', np.ones(1280, dtype=np.float32) * .1)
        self.meter.submit('tts', np.ones(1024, dtype=np.float32) * .2)
        self.meter._tick(time.monotonic())
        self.meter.clear('mic')
        self.meter._tick(time.monotonic())
        self.assertEqual(self.messages[-1], 'AMPLITUDE:mic:0.0,0.0,0.0,0.0')
        self.assertTrue(self.meter._active['tts'])

    def test_stale_stream_sends_silence_once(self):
        self.meter.submit('tts', np.ones(1024, dtype=np.float32) * .2)
        now = time.monotonic()
        self.meter._tick(now)
        self.meter._tick(now + .3)
        self.meter._tick(now + .6)
        self.assertEqual(len(self.messages), 2)
        self.assertEqual(self.messages[-1], 'AMPLITUDE:tts:0.0,0.0,0.0,0.0')

    def test_mailbox_is_bounded_and_copies_callback_memory(self):
        block = np.ones(1024, dtype=np.float32) * .1
        for _ in range(1000):
            self.meter.submit('tts', block)
        block.fill(0)
        self.assertEqual(len(self.meter._pending['tts']), 1)
        self.meter._tick(time.monotonic())
        self.assertEqual(self.messages, ['AMPLITUDE:tts:0.4,0.4,0.4,0.4'])

    def test_unavailable_bridge_is_best_effort(self):
        meter = AudioMeter(1)
        with patch('voice.audio_meter.socket.create_connection', side_effect=TimeoutError):
            meter.submit('mic', np.ones(1280, dtype=np.int16))
            meter._tick(time.monotonic())

    def test_tts_callback_measures_played_samples_and_silence(self):
        from voice.tts import BaseTTSEngine
        engine = BaseTTSEngine.__new__(BaseTTSEngine)
        engine._audio_meter = self.meter
        engine._audio_queue = queue.Queue()
        engine._audio_queue.put(np.full(512, .125, dtype=np.float32))
        engine._audio_buffer = np.array([], dtype=np.float32)
        engine._buffer_lock = threading.Lock()
        engine.is_speaking = threading.Event()
        output = np.empty((1024, 1), dtype=np.float32)
        engine._audio_callback(output, 1024, None, None)
        self.meter._tick(time.monotonic())
        self.assertEqual(self.messages[-1], 'AMPLITUDE:tts:0.5,0.5,0.0,0.0')
        self.assertTrue(np.all(output[512:] == 0))
        engine._audio_callback(output, 1024, None, None)
        self.meter._tick(time.monotonic())
        self.assertEqual(self.messages[-1], 'AMPLITUDE:tts:0.0,0.0,0.0,0.0')

    def test_both_recording_entrypoints_forward_existing_mic_blocks(self):
        class Input:
            def __init__(self, **kwargs): pass
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, size): return np.full((size, 1), 4096, dtype=np.int16), False

        for module_name in ('voice.pipeline', 'voice.stt'):
            module = importlib.import_module(module_name)
            with patch.object(module.sd, 'InputStream', Input), patch.object(module, 'get_audio_meter', return_value=self.meter):
                # A released PTT button exits after one block without writing a WAV.
                if module_name.endswith('pipeline'):
                    module.ptt_active.clear()
                    self.assertIsNone(module.record_speech(ptt_mode=True))
                else:
                    self.assertIsNone(module.record_speech(ptt_event=threading.Event()))
            self.meter._tick(time.monotonic())
            self.assertEqual(self.messages[-1], 'AMPLITUDE:mic:0.5,0.5,0.5,0.5')

    def test_tts_completion_waits_for_inflight_synthesis(self):
        from voice.tts import BaseTTSEngine
        engine = BaseTTSEngine.__new__(BaseTTSEngine)
        engine._text_queue = queue.Queue()
        engine._text_queue.put('Still synthesizing')
        engine._text_queue.get_nowait()  # Queue empty, but work remains in flight.
        engine._audio_queue = queue.Queue()
        engine._audio_buffer = np.array([], dtype=np.float32)
        engine._buffer_lock = threading.Lock()
        engine._last_callback_time = time.time()
        engine.is_speaking = threading.Event()
        done = threading.Event()
        worker = threading.Thread(target=lambda: (engine.wait_until_done(timeout=1), done.set()))
        worker.start()
        self.assertFalse(done.wait(.05), 'Must not announce idle before synthesis finishes')
        engine._text_queue.task_done()
        worker.join(timeout=1)
        self.assertTrue(done.is_set())


if __name__ == '__main__':
    unittest.main()
