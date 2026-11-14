"""Audio device management for Aura.

Allows selecting and querying input microphones independently of the
system default recording device. Persists user preference to disk
and synchronizes with sounddevice and voice pipelines.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from pathlib import Path
from typing import Any, Callable

import numpy as np
import sounddevice as sd

logger = logging.getLogger(__name__)

CONFIG_PATH = Path(__file__).resolve().parent.parent / "data" / "audio_config.json"

_lock = threading.Lock()
_listeners: list[Callable[[int | None, str | None], None]] = []
_selected_device_id: int | None = None
_selected_device_name: str | None = None
_selected_hostapi: str | None = None


def _load_saved_config() -> dict[str, Any]:
    try:
        if CONFIG_PATH.is_file():
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning("Could not read audio config from %s: %s", CONFIG_PATH, e)
    return {}


def _save_config(data: dict[str, Any]) -> None:
    try:
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.warning("Could not write audio config to %s: %s", CONFIG_PATH, e)


def get_default_input_device_id() -> int | None:
    """Return the system default input device ID from sounddevice."""
    try:
        default = sd.default.device
        if default is not None:
            dev_idx = default[0]
            if dev_idx is not None and int(dev_idx) >= 0:
                return int(dev_idx)
    except Exception:
        pass
    return None


def list_input_devices() -> list[dict[str, Any]]:
    """Enumerate all available audio input devices with friendly names and host API info."""
    devices = []
    try:
        raw_devices = sd.query_devices()
        try:
            hostapis = {i: h["name"] for i, h in enumerate(sd.query_hostapis())}
        except Exception:
            hostapis = {}

        sys_default = get_default_input_device_id()
        current_id = get_selected_device_id()

        for idx, dev in enumerate(raw_devices):
            max_in = dev.get("max_input_channels", 0)
            if max_in <= 0:
                continue

            hostapi_name = hostapis.get(dev.get("hostapi", -1), "Unknown")
            # Exclude Windows WDM-KS as PortAudio's blocking stream API is unsupported for it
            if "WDM-KS" in hostapi_name:
                continue

            dev_name = dev.get("name", f"Microphone {idx}")

            is_def = (idx == sys_default)
            is_sel = (idx == current_id) if current_id is not None else is_def

            devices.append({
                "id": idx,
                "name": dev_name,
                "hostapi": hostapi_name,
                "channels": max_in,
                "default_samplerate": int(dev.get("default_samplerate", 16000)),
                "is_system_default": is_def,
                "is_selected": is_sel,
            })
    except Exception as e:
        logger.error("Failed to list audio input devices: %s", e)

    return devices


def _resolve_device(saved_id: int | None, saved_name: str | None, saved_hostapi: str | None) -> tuple[int | None, str | None]:
    """Find the best matching device index given saved preferences."""
    if saved_name is None and saved_id is None:
        return None, None

    try:
        raw_devices = sd.query_devices()
        try:
            hostapis = {i: h["name"] for i, h in enumerate(sd.query_hostapis())}
        except Exception:
            hostapis = {}

        # 1. Match by exact name and hostapi (preferring non-WDM-KS)
        if saved_name:
            for idx, dev in enumerate(raw_devices):
                if dev.get("max_input_channels", 0) > 0 and dev.get("name") == saved_name:
                    api = hostapis.get(dev.get("hostapi", -1), "")
                    if "WDM-KS" not in api:
                        if saved_hostapi and api == saved_hostapi:
                            return idx, saved_name

            # 2. Match by exact name with any non-WDM-KS hostapi
            for idx, dev in enumerate(raw_devices):
                if dev.get("max_input_channels", 0) > 0 and dev.get("name") == saved_name:
                    api = hostapis.get(dev.get("hostapi", -1), "")
                    if "WDM-KS" not in api:
                        return idx, saved_name

        # 3. Check if saved_id is still valid and an input device matching the name
        if saved_id is not None and 0 <= saved_id < len(raw_devices):
            dev = raw_devices[saved_id]
            api = hostapis.get(dev.get("hostapi", -1), "")
            if dev.get("max_input_channels", 0) > 0 and "WDM-KS" not in api:
                if not saved_name or dev.get("name") == saved_name:
                    return saved_id, dev.get("name")
    except Exception as e:
        logger.warning("Error resolving audio device: %s", e)

    return None, None


def init_audio_device() -> None:
    """Initialize audio device on server startup from saved config."""
    global _selected_device_id, _selected_device_name, _selected_hostapi
    with _lock:
        cfg = _load_saved_config()
        saved_id = cfg.get("device_id")
        saved_name = cfg.get("device_name")
        saved_hostapi = cfg.get("hostapi")

        resolved_id, resolved_name = _resolve_device(saved_id, saved_name, saved_hostapi)
        _selected_device_id = resolved_id
        _selected_device_name = resolved_name
        _selected_hostapi = saved_hostapi

        # Save corrected device_id if it was re-resolved
        if resolved_id != saved_id or resolved_name != saved_name:
            _save_config({
                "device_id": _selected_device_id,
                "device_name": _selected_device_name,
                "hostapi": _selected_hostapi,
            })

        _apply_sounddevice_default(resolved_id)
        logger.info(
            "Audio device initialized: ID=%s, Name=%r (saved: ID=%s, Name=%r)",
            _selected_device_id,
            _selected_device_name,
            saved_id,
            saved_name,
        )


def _apply_sounddevice_default(dev_id: int | None) -> None:
    """Update sounddevice.default.device[0] so libraries without device param use it."""
    try:
        current_default = sd.default.device
        out_dev = current_default[1] if current_default is not None else None
        if dev_id is not None and dev_id >= 0:
            sd.default.device = (dev_id, out_dev)
            logger.info("Set sd.default.device to (%s, %s)", dev_id, out_dev)
        else:
            orig_in = get_default_input_device_id()
            sd.default.device = (orig_in, out_dev)
    except Exception as e:
        logger.warning("Failed to update sd.default.device: %s", e)


def get_selected_device_id() -> int | None:
    """Return currently selected input device ID, or None if system default is used.
    
    Dynamically validates that the device ID actually exists and is an input device.
    If the device ID has become invalid (e.g. device disconnected or index shifted),
    it automatically re-resolves the device or safely falls back to system default.
    """
    global _selected_device_id, _selected_device_name, _selected_hostapi
    with _lock:
        if _selected_device_id is None:
            return None

        try:
            raw_devices = sd.query_devices()
            if 0 <= _selected_device_id < len(raw_devices):
                dev = raw_devices[_selected_device_id]
                # Valid if it has input channels and matches the expected device name (if known)
                if dev.get("max_input_channels", 0) > 0:
                    if not _selected_device_name or dev.get("name") == _selected_device_name:
                        return _selected_device_id
        except Exception:
            pass

        # Device index changed or out of range: attempt re-resolution
        logger.warning(
            "Selected audio device ID %s is out of range or invalid for %r; re-resolving...",
            _selected_device_id,
            _selected_device_name,
        )
        resolved_id, resolved_name = _resolve_device(_selected_device_id, _selected_device_name, _selected_hostapi)
        if resolved_id is not None:
            logger.info("Re-resolved audio device to ID %s (%s)", resolved_id, resolved_name)
            _selected_device_id = resolved_id
            _selected_device_name = resolved_name
            _save_config({
                "device_id": _selected_device_id,
                "device_name": _selected_device_name,
                "hostapi": _selected_hostapi,
            })
            _apply_sounddevice_default(_selected_device_id)
            return _selected_device_id

        # Fallback to system default if unresolvable
        logger.warning("Microphone %r no longer available; reverting to system default.", _selected_device_name)
        _selected_device_id = None
        _selected_device_name = None
        _selected_hostapi = None
        _save_config({"device_id": None, "device_name": None, "hostapi": None})
        _apply_sounddevice_default(None)
        return None


def get_selected_device_name() -> str | None:
    """Return currently selected input device name, or None."""
    with _lock:
        return _selected_device_name


def set_selected_device(device_id: int | None, device_name: str | None = None) -> dict[str, Any]:
    """Select active microphone. Pass device_id=None or -1 to revert to system default."""
    global _selected_device_id, _selected_device_name, _selected_hostapi

    with _lock:
        if device_id is None or device_id < 0:
            # Revert to system default
            _selected_device_id = None
            _selected_device_name = None
            _selected_hostapi = None
            _save_config({"device_id": None, "device_name": None, "hostapi": None})
            _apply_sounddevice_default(None)
            logger.info("Microphone reset to system default.")
        else:
            raw_devices = sd.query_devices()
            if device_id >= len(raw_devices):
                raise ValueError(f"Invalid device ID: {device_id} (system has {len(raw_devices)} devices)")

            dev = raw_devices[device_id]
            if dev.get("max_input_channels", 0) <= 0:
                raise ValueError(f"Device {device_id} ({dev.get('name')}) is not an input device")

            hostapis = {i: h["name"] for i, h in enumerate(sd.query_hostapis())}
            hostapi_name = hostapis.get(dev.get("hostapi", -1), "")

            if "WDM-KS" in hostapi_name:
                raise ValueError(f"Device {device_id} ({dev.get('name')}) uses WDM-KS which is unsupported for streaming capture.")

            # Test-open the stream briefly to ensure Windows accepts this device ID
            test_rate = 16000
            try:
                with sd.InputStream(device=device_id, samplerate=test_rate, channels=1, dtype="int16", blocksize=1280):
                    pass
            except Exception as test_err:
                native_rate = int(dev.get("default_samplerate", 16000))
                if native_rate != test_rate:
                    try:
                        with sd.InputStream(device=device_id, samplerate=native_rate, channels=1, dtype="int16", blocksize=1280):
                            pass
                    except Exception:
                        raise ValueError(f"Microphone {device_id} ({dev.get('name')}) could not be opened: {test_err}")
                else:
                    raise ValueError(f"Microphone {device_id} ({dev.get('name')}) could not be opened: {test_err}")

            _selected_device_id = device_id
            _selected_device_name = device_name or dev.get("name")
            _selected_hostapi = hostapi_name

            _save_config({
                "device_id": _selected_device_id,
                "device_name": _selected_device_name,
                "hostapi": _selected_hostapi,
            })
            _apply_sounddevice_default(_selected_device_id)
            logger.info("Microphone set to ID %s: %s (%s)", _selected_device_id, _selected_device_name, _selected_hostapi)

        curr_id = _selected_device_id
        curr_name = _selected_device_name
        listeners_copy = list(_listeners)

    # Notify listeners outside the lock to prevent deadlock
    for listener in listeners_copy:
        try:
            listener(curr_id, curr_name)
        except Exception as e:
            logger.warning("Error notifying audio device listener: %s", e)

    return {
        "success": True,
        "current_device": curr_id,
        "current_device_name": curr_name,
    }


def register_device_change_listener(callback: Callable[[int | None, str | None], None]) -> None:
    """Register a callback that fires whenever the active microphone changes."""
    with _lock:
        if callback not in _listeners:
            _listeners.append(callback)


def test_microphone(duration: float = 1.5, device_id: int | None = None) -> dict[str, Any]:
    """Test audio capture on the selected (or specified) microphone.
    
    Records for `duration` seconds and computes RMS and peak amplitude.
    Returns status and peak values.
    """
    dev_to_use = device_id if device_id is not None else get_selected_device_id()
    sample_rate = 16000
    frames = []

    try:
        try:
            stream_ctx = sd.InputStream(
                device=dev_to_use,
                samplerate=sample_rate,
                channels=1,
                dtype="int16",
                blocksize=1280,
            )
        except Exception as stream_err:
            if dev_to_use is not None:
                logger.warning("Could not open mic ID %s (%s), trying system default...", dev_to_use, stream_err)
                dev_to_use = None
                stream_ctx = sd.InputStream(
                    device=None,
                    samplerate=sample_rate,
                    channels=1,
                    dtype="int16",
                    blocksize=1280,
                )
            else:
                raise stream_err

        with stream_ctx as stream:
            # Drain first 0.1s
            for _ in range(int(0.1 * sample_rate / 1280)):
                stream.read(1280)

            # Record for duration
            num_chunks = int(duration * sample_rate / 1280)
            for _ in range(num_chunks):
                chunk, _ = stream.read(1280)
                frames.append(chunk.copy())

        if not frames:
            return {"success": False, "peak": 0.0, "rms": 0.0, "message": "No audio frames captured"}

        audio_data = np.concatenate(frames, axis=0)
        peak_int16 = int(np.abs(audio_data).max())
        peak_norm = round(min(1.0, peak_int16 / 32767.0), 3)
        rms = round(float(np.sqrt(np.mean(np.square(audio_data.astype(np.float32)))) / 32767.0), 3)

        return {
            "success": True,
            "peak": peak_norm,
            "rms": rms,
            "device_id": dev_to_use,
            "device_name": get_selected_device_name() or "System Default",
            "message": "Microphone is working properly." if peak_norm > 0.005 else "Audio signal is very low. Check mic volume or mute switch.",
        }
    except Exception as e:
        logger.error("Microphone test failed: %s", e)
        return {
            "success": False,
            "peak": 0.0,
            "rms": 0.0,
            "message": f"Microphone error: {str(e)}",
        }
