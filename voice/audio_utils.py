"""Audio processing utilities for amplitude analysis and WebSocket payloads."""

import numpy as np


def generate_amplitude_payload(audio_chunk: np.ndarray) -> str:
    """Compute 4-band RMS amplitude from a float32 audio chunk and return an AMPLITUDE: string.

    Args:
        audio_chunk: 1-D float32 numpy array of audio samples (range -1.0 to 1.0).

    Returns:
        A WebSocket payload string like ``AMPLITUDE:0.45,0.67,0.22,0.89``.
        Returns ``AMPLITUDE:0.0,0.0,0.0,0.0`` on empty input.
    """
    if audio_chunk.size == 0:
        return "AMPLITUDE:0.0,0.0,0.0,0.0"

    sub_chunks = np.array_split(audio_chunk, 4)
    amplitudes = []

    for chunk in sub_chunks:
        if chunk.size == 0:
            amplitudes.append(0.0)
            continue
        rms = float(np.sqrt(np.mean(np.square(chunk.astype(np.float64)))))
        normalized = min(rms * 4.0, 1.0)
        amplitudes.append(round(normalized, 3))

    return f"AMPLITUDE:{amplitudes[0]},{amplitudes[1]},{amplitudes[2]},{amplitudes[3]}"
