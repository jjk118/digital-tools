import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import market_service as market
import munich_history_fallback as munich


class MunichHistoryTests(unittest.TestCase):
    def test_actual_labels_and_duplicate_chart_series(self):
        labels = [f'Der Kurs des Hauptinstruments beträgt {price} Das Volumen des Hauptinstruments ist - {day}. Oktober 2026'
                  for day, price in [(14, '58.35'), (15, '58.562'), (16, '58.775')]]
        points = munich.parse_points(labels + labels)
        self.assertEqual(len(points), 3)
        self.assertEqual(points[1], {'date': '2026-10-15', 'close': 58.562})

    def test_reject_conflicting_same_date(self):
        labels = [f'Der Kurs des Hauptinstruments beträgt {p} Das Volumen des Hauptinstruments ist - 15. Oktober 2026' for p in ('58.562', '59')]
        with self.assertRaisesRegex(ValueError, 'Conflicting'):
            munich.parse_points(labels)

    def test_two_closes_before_berlin_quote_date(self):
        history = {'source': 'Börse München official dated history', 'url': 'https://www.boerse-muenchen.de/fonds/LU0690374961/',
                   'closes': [{'date': '2026-10-14', 'close': 58.35}, {'date': '2026-10-15', 'close': 58.562}, {'date': '2026-10-16', 'close': 58.775}]}
        with patch.object(market, 'fetch', side_effect=ValueError('Yahoo absent')), patch.object(market, 'munich_history', return_value=history):
            result = market.previous_day_change('GQC0.MU', '2026-10-16T00:30:00+02:00')
        self.assertAlmostEqual(result['prev_day_pct_change'], (58.562 / 58.35 - 1) * 100)
        self.assertEqual(result['prev_day_change_as_of'], '2026-10-15')
        self.assertIsNone(result['prev_day_change_error'])

    def test_reject_stale_closes(self):
        history = {'source': 'Börse München official dated history', 'url': 'test',
                   'closes': [{'date': '2026-09-14', 'close': 58.35}, {'date': '2026-09-15', 'close': 58.562}]}
        with patch.object(market, 'fetch', side_effect=ValueError('Yahoo absent')), patch.object(market, 'munich_history', return_value=history):
            with self.assertRaisesRegex(ValueError, 'stale'):
                market.previous_day_change('GQC0.MU', '2026-10-16T21:42:00+00:00')

    def test_unverified_symbol_does_not_open_browser(self):
        with self.assertRaisesRegex(ValueError, 'mapping'):
            munich.retrieve('OTHER.MU')


if __name__ == '__main__':
    unittest.main()
