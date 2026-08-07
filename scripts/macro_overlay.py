"""PySide6 overlay for macro recording — countdown display + floating stop button."""

import json
import sys
import time
from pathlib import Path

from PySide6.QtCore import Qt, QTimer, QRect
from PySide6.QtGui import QPainter, QColor, QFont, QPen, QBrush, QRadialGradient
from PySide6.QtWidgets import QApplication, QWidget

SIGNAL_DIR = Path(__file__).resolve().parent.parent / "data" / "macros"
SIGNAL_DIR.mkdir(parents=True, exist_ok=True)


class CountdownOverlay(QWidget):
    def __init__(self, duration: int):
        super().__init__()
        self.duration = duration
        self.end_time = time.time() + duration

        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setAttribute(Qt.WA_ShowWithoutActivating)
        self.setAttribute(Qt.WA_TransparentForMouseEvents, True)

        screen = QApplication.primaryScreen()
        geo = screen.availableGeometry()
        size = 280
        self.setGeometry(
            (geo.width() - size) // 2,
            (geo.height() - size) // 2 + 80,
            size, size,
        )

        self.font_num = QFont("Consolas", 72, QFont.Bold)
        self.font_label = QFont("Segoe UI", 11)

        QTimer.singleShot(duration * 1000, QApplication.quit)

        self.paint_timer = QTimer(self)
        self.paint_timer.timeout.connect(self.update)
        self.paint_timer.start(100)

        self.show()

    def _remaining(self) -> int:
        return max(0, round(self.end_time - time.time()))

    def paintEvent(self, event):
        remaining = self._remaining()

        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        w, h = self.width(), self.height()
        cx, cy = w // 2, h // 2

        painter.setCompositionMode(QPainter.CompositionMode_Clear)
        painter.fillRect(self.rect(), Qt.transparent)
        painter.setCompositionMode(QPainter.CompositionMode_SourceOver)

        progress = 1.0 - (remaining / max(self.duration, 1))

        pen = QPen(QColor(139, 92, 246, 60), 2)
        painter.setPen(pen)
        painter.setBrush(Qt.NoBrush)
        painter.drawEllipse(cx - 100, cy - 100, 200, 200)

        pen_prog = QPen(QColor(139, 92, 246, 200), 3)
        pen_prog.setCapStyle(Qt.RoundCap)
        painter.setPen(pen_prog)
        painter.drawArc(cx - 100, cy - 100, 200, 200, 90 * 16, int(-360 * progress * 16))

        painter.setPen(Qt.NoPen)
        painter.setBrush(QColor(139, 92, 246, 20))
        painter.drawEllipse(cx - 60, cy - 60, 120, 120)

        gradient = QRadialGradient(cx, cy, 40)
        gradient.setColorAt(0, QColor(139, 92, 246, 30))
        gradient.setColorAt(1, QColor(139, 92, 246, 0))
        painter.setBrush(QBrush(gradient))
        painter.drawEllipse(cx - 40, cy - 40, 80, 80)

        painter.setFont(self.font_num)
        painter.setPen(QColor(220, 220, 240))
        painter.drawText(QRect(0, cy - 60, w, 80), Qt.AlignCenter, str(remaining))

        painter.setFont(self.font_label)
        painter.setPen(QColor(139, 92, 246, 180))
        painter.drawText(QRect(0, cy + 30, w, 30), Qt.AlignCenter, "RECORDING IN...")


class StopOverlay(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setAttribute(Qt.WA_ShowWithoutActivating)

        self.setGeometry(12, 12, 40, 40)

        with open(SIGNAL_DIR / "_stop_pos.json", "w") as f:
            json.dump({"x": 12, "y": 12, "w": 40, "h": 40}, f)

        self.font = QFont("Segoe UI", 10, QFont.Bold)
        self.show()

    def mousePressEvent(self, event):
        with open(SIGNAL_DIR / "_stop_signal.json", "w") as f:
            json.dump({"action": "stop"}, f)
        QApplication.quit()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        painter.setCompositionMode(QPainter.CompositionMode_Clear)
        painter.fillRect(self.rect(), Qt.transparent)
        painter.setCompositionMode(QPainter.CompositionMode_SourceOver)

        painter.setPen(Qt.NoPen)
        painter.setBrush(QColor(0, 0, 0, 200))
        painter.drawRoundedRect(0, 0, 40, 40, 10, 10)

        painter.setBrush(QColor(239, 68, 68, 220))
        painter.drawRoundedRect(12, 12, 16, 16, 3, 3)

        painter.setPen(QColor(255, 255, 255, 80))
        painter.setBrush(Qt.NoBrush)
        painter.drawRoundedRect(0, 0, 40, 40, 10, 10)


def main():
    app = QApplication(sys.argv)
    if len(sys.argv) > 1:
        try:
            seconds = int(sys.argv[1])
            CountdownOverlay(seconds)
        except ValueError:
            StopOverlay()
    else:
        StopOverlay()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
