import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import pandas as pd
import time
import re
from typing import List, Dict, Set
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# Заданные множества (расширены по HTML popup)
card_types: Set[str] = {"Дебетовая карта", "Кредитная карта"}
banks: Set[str] = {
    "Альфа-Банк", "ВТБ", "Газпромбанк", "Московский Кредитный Банк (МКБ)", 
    "Промсвязьбанк (ПСБ)", "ПСБ", "Райффайзенбанк", "Россельхозбанк", 
    "Совкомбанк", "Т-Банк", "Банк ДОМ.РФ", "ЮниКредит Банк"
}
criterias: Set[str] = {
    "Стоимость обслуживания (дебетовая)", "Стоимость обслуживания (кредитная)",
    "СМС-уведомления", "Снятие наличных в других банках",
    "Переводы по реквизитам в другие банки", "Процент на остаток", 
    "Кредитный лимит", "Процентные ставки", "Первоначальный взнос", 
    "Программа лояльности (дебетовая)", "Программа лояльности (кредитная)"
}

# Маппинг реальных названий из popup на criterias
CRITERIA_MAP = {
    'Годовое обслуживание': 'Стоимость обслуживания (кредитная)',
    'Кредитный лимит': 'Кредитный лимит',
    'Процентная ставка': 'Процентные ставки',
    'Снятие наличных в любых банкоматах': 'Снятие наличных в других банках',
    'Баллы': 'Программа лояльности (кредитная)',
    'Льготный период': 'Льготный период',  # Можно добавить в criterias если нужно
}

endpoints = {
    'deposits': 'https://www.banki.ru/products/deposits/',
    'creditcards': 'https://www.banki.ru/products/creditcards/',
    'debitcards': 'https://www.banki.ru/products/debitcards/'
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def setup_driver(headless=True):
    options = Options()
    if headless:
        options.add_argument('--headless=new')  # New headless mode (less detectable)
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--disable-extensions')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument(f'--user-agent={HEADERS["User-Agent"]}')
    driver = webdriver.Chrome(options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    driver.execute_script("Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]})")
    driver.execute_script("Object.defineProperty(navigator, 'languages', {get: () => ['ru-RU', 'ru', 'en-US', 'en']})")
    return driver

def parse_catalog_selenium(driver, url: str, product_type: str, max_pages: int = 2) -> List[Dict]:
    products = []
    driver.get(url)
    
    # Шаг 1: Ждем базовую загрузку страницы (title или body)
    WebDriverWait(driver, 15).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )
    time.sleep(5)  # Доп. пауза для JS modules
    
    # Шаг 2: Ждем счетчик предложений (раньше list-item)
    try:
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '[data-test="offers-count"]'))
        )
        print("✅ Счетчик предложений загружен")
    except TimeoutException:
        print("⚠️ Счетчик не найден, пробуем прямой поиск list-item")
    
    # Шаг 3: Скролл вниз для lazy-load
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight / 2);")
    time.sleep(3)
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(5)
    
    # Основной парсинг (несколько попыток)
    for attempt in range(3):
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        product_items = soup.find_all('div', {'data-test': 'offers-grouped-list-item'})
        
        if product_items:
            print(f"✅ Найдено {len(product_items)} продуктов на стр. 1")
            break
        print(f"Попытка {attempt+1}: list-item не найдены, повторный скролл...")
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3)
    else:
        print("❌ Продукты не загружены. Сайт заблокировал?")
        return []
    
    # Парсим найденные
    for item in product_items:
        bank_elem = item.select_one('[data-test="offer-company"]')
        if not bank_elem or bank_elem.get_text(strip=True) not in banks:
            continue
        
        name_elem = item.select_one('[data-test="offer-product-name"]')
        product_name = name_elem.get_text(strip=True) if name_elem else 'N/A'
        
        # Кнопка "Подробнее" (Selenium WebElement для клика)
        try:
            info_button = driver.execute_script("""
                var btn = arguments[0].querySelector('button[data-test="offer-info-button"]');
                return btn ? {element: btn} : null;
            """, item)
            if not info_button:
                continue
        except:
            continue
        
        products.append({
            'bank': bank_elem.get_text(strip=True),
            'name': product_name,
            'type': "Кредитная карта" if 'creditcards' in product_type else "Дебетовая карта" if 'debitcards' in product_type else 'Вклад',
            'item_selector': item,  # Для позиционирования
            'info_button_script': f'document.querySelectorAll("[data-test=\\"offer-info-button\\"]")[{len(products)}]'  # Индекс для скрипта
        })
    
    # Пагинация (осторожно, 1-2 стр. хватит)
    for page in range(2, max_pages + 1):
        try:
            next_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, 'a[href*="page=' + str(page) + '"]'))
            )
            driver.execute_script("arguments[0].scrollIntoView(true); arguments[0].click();", next_btn)
            time.sleep(5)
            # Повтор парсинга...
        except TimeoutException:
            break
    
    return products

def parse_product_details_from_popup(driver, product_index: int) -> Dict[str, str]:
    data = {}
    try:
        # Клик по кнопке "Подробнее" по индексу (поскольку элементы динамичны)
        info_script = f"""
            var buttons = document.querySelectorAll('button[data-test="offer-info-button"]');
            if (buttons[{product_index}]) {{
                buttons[{product_index}].scrollIntoView({{behavior: 'smooth', block: 'center'}});
                buttons[{product_index}].click();
                return true;
            }}
            return false;
        """
        clicked = driver.execute_script(info_script)
        if not clicked:
            print("❌ Кнопка Подробнее не найдена")
            return data
        
        # Ждем popup
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '[data-test="detailed-popup"]'))
        )
        time.sleep(3)  # Стабилизация
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        popup = soup.find('div', {'data-test': 'detailed-popup'})
        if not popup:
            return data
        
        # Парсинг фич (top)
        for fdiv in popup.find_all('div', attrs={'data-test': True}):
            if fdiv['data-test'].startswith('detailed-popup-feature-'):
                title = fdiv['data-test'].replace('detailed-popup-feature-', '')
                value_elem = fdiv.select_one('.Text__sc-vycpdy-0.dSyfCQ, [data-test="text"].dSyfCQ')
                value = value_elem.get_text(strip=True) if value_elem else 'N/A'
                mapped = CRITERIA_MAP.get(title, title)
                data[mapped] = value
        
        # Таблица Тарифы (первый details open)
        tariffs_details = popup.select_one('details[open] table.TableDescriptionList__sc-1nkc3an-0')
        if tariffs_details:
            rows = tariffs_details.select('tbody tr')
            for row in rows:
                th = row.select_one('th')
                td = row.select_one('td')
                if th and td:
                    criterion = th.get_text(strip=True).strip()
                    value = td.get_text(separator=' ', strip=True)
                    mapped = CRITERIA_MAP.get(criterion, criterion)
                    if mapped in criterias:
                        data[mapped] = value
        
        print(f"✅ Извлечено {len(data)} критериев")
    
    except TimeoutException as e:
        print(f"⏰ Popup timeout: {e}")
    except Exception as e:
        print(f"❌ Popup error: {e}")
    finally:
        # Закрытие popup
        try:
            close_btns = driver.find_elements(By.CSS_SELECTOR, '[aria-label="закрыть"], .sc-gueYoa, [role="button"][tabindex="0"]')
            if close_btns:
                driver.execute_script("arguments[0].click();", close_btns[0])
            else:
                driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
            time.sleep(1)
        except:
            pass
    
    return data

def main():
    driver = setup_driver(headless=False)  # NON-headless для дебага (уберите False для прод)
    try:
        all_data = []
        
        # Тестируем только creditcards сначала
        prod_type = 'creditcards'
        url = endpoints[prod_type]
        print(f"\n=== {prod_type.upper()} ===")
        
        catalog_products = parse_catalog_selenium(driver, url, prod_type, max_pages=1)
        print(f"Найдено {len(catalog_products)} продуктов от нужных банков")
        
        for idx, prod in enumerate(catalog_products[:3]):  # Топ-3 для теста
            print(f"\n[{idx}] {prod['bank']} - {prod['name']}")
            details = parse_product_details_from_popup(driver, idx)
            row = {'type': prod['type'], 'bank': prod['bank'], 'product': prod['name']}
            row.update(details)
            all_data.append(row)
            time.sleep(3)
        
        if all_data:
            df = pd.DataFrame(all_data).fillna('N/A').sort_values('bank')
            print(df.to_markdown(index=False))
            df.to_csv('banki_test_data.csv', index=False, encoding='utf-8')
            print("\n✅ Данные сохранены!")
        else:
            print("❌ Нет данных")
    
    finally:
        input("Нажмите Enter для закрытия браузера...")  # Для дебага
        driver.quit()

if __name__ == "__main__":
    main()