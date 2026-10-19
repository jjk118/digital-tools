"""Official Munich dated closes, using only explicitly verified share classes."""
import datetime as dt
import json
import math
import re
import sys

INSTRUMENTS = {'GQC0.MU': 'LU0690374961'}
MONTHS = {name: i for i, name in enumerate(('Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'), 1)}


def parse_points(labels):
    pattern = r'Der Kurs des Hauptinstruments beträgt (\d+(?:\.\d+)?) Das Volumen des Hauptinstruments ist .*? (\d{1,2})\. (\w+) (\d{4})'
    points = {}
    for label in labels:
        match = re.fullmatch(pattern, label or '')
        if not match:
            continue
        price, day, month, year = match.groups()
        date = dt.date(int(year), MONTHS[month], int(day)).isoformat()
        price = float(price)
        if not math.isfinite(price) or price <= 0:
            raise ValueError('Invalid Munich close')
        if date in points and points[date] != price:
            raise ValueError('Conflicting Munich closes for ' + date)
        points[date] = price
    if len(points) < 2:
        raise ValueError('Fewer than two dated Munich closes')
    return [{'date': date, 'close': value} for date, value in sorted(points.items())]


def retrieve(ticker):
    if ticker not in INSTRUMENTS:
        raise ValueError('No verified Munich ticker/ISIN mapping')
    from playwright.sync_api import sync_playwright
    isin = INSTRUMENTS[ticker]
    url = 'https://www.boerse-muenchen.de/fonds/' + isin + '/'
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        try:
            page = browser.new_page(locale='de-DE')
            response = page.goto(url, wait_until='domcontentloaded', timeout=30000)
            if not response or response.status != 200 or page.url != url:
                raise ValueError('Munich instrument page unavailable or redirected')
            necessary = page.get_by_role('button', name=re.compile(r'(?i)(nur notwendige|nur erforderliche|necessary only|ablehnen)'))
            if necessary.count() == 1 and necessary.is_visible():
                necessary.click()
            page.get_by_text(ticker[:-3], exact=True).wait_for(timeout=25000)
            labels = page.get_by_role('img', name=re.compile(r'^Der Kurs des Hauptinstruments beträgt '))
            labels.first.wait_for(timeout=25000)
            closes = parse_points(labels.evaluate_all('(els) => els.map(e => e.getAttribute("aria-label"))'))
            page.get_by_role('link', name='ERWEITERTER CHART', exact=True).click()
            page.get_by_role('row', name='Kurswährung EUR', exact=True).wait_for(timeout=20000)
            return {'ticker': ticker, 'isin': isin, 'currency': 'EUR',
                    'source': 'Börse München official dated history', 'url': url,
                    'closes': closes, 'retrieved_at': dt.datetime.now(dt.timezone.utc).isoformat()}
        finally:
            browser.close()


if __name__ == '__main__':
    try:
        print(json.dumps(retrieve(sys.argv[1]), ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'error': str(error)}))
        sys.exit(1)
