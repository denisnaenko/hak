import requests
import json
import os
import csv
from gigachat import GigaChat
from prompts import PRODUCT_ANALYST_PROMPT 

prompt = PRODUCT_ANALYST_PROMPT

# Конфигурация для OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or "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"
OPENROUTER_MODELS = ["x-ai/grok-4.1-fast:free", "deepseek/deepseek-r1-0528-qwen3-8b"]
CSV_FILE = "data/model_responses.csv"

# Конфигурация для GigaChat
GIGACHAT_CREDENTIALS = 'MDE5YWFiZTAtNjE1Zi03ZGNiLWJlMGItZjlkMzA5NWI0MTVmOjY5NWZmZDQ1LTdhYWEtNDdiOC1hMWMwLTRmZWYwYzYxNTNhOA=='
giga = GigaChat(
    credentials=GIGACHAT_CREDENTIALS,
    verify_ssl_certs=False 
)

def make_openrouter_request(model):
    """Выполняет запрос к OpenRouter API для указанной модели и возвращает результаты."""
    try:
        print(f"=== Запрос для модели {model} (OpenRouter) ===")
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            data=json.dumps({
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "extra_body": {"reasoning": {"enabled": True}}
            }),
            timeout=30
        )
        
        status_code = response.status_code
        if status_code != 200:
            print(f"Ошибка для {model}: {status_code}")
            print(response.text if hasattr(response, 'text') else "Нет текста ошибки")
            return {
                "model": model,
                "response": f"Ошибка: {status_code}",
                "reasoning_present": False,
                "status_code": status_code
            }
        
        data = response.json()
        assistant_message = data['choices'][0]['message']
        content = assistant_message.get('content', 'Нет содержимого')
        reasoning_present = 'reasoning_details' in assistant_message
        
        print(f"Ответ: {content}")
        print(f"Reasoning details присутствуют: {reasoning_present}")
        
        return {
            "model": model,
            "response": content,
            "reasoning_present": reasoning_present,
            "status_code": status_code
        }
            
    except requests.exceptions.Timeout:
        print(f"Таймаут для {model}")
        return {
            "model": model,
            "response": "Таймаут",
            "reasoning_present": False,
            "status_code": -1
        }
    except requests.exceptions.RequestException as e:
        print(f"Ошибка сети для {model}: {e}")
        return {
            "model": model,
            "response": f"Ошибка сети: {e}",
            "reasoning_present": False,
            "status_code": -2
        }
    except KeyError as e:
        print(f"Ошибка в структуре ответа для {model}: {e}")
        return {
            "model": model,
            "response": f"Ошибка парсинга: {e}",
            "reasoning_present": False,
            "status_code": 0
        }
    except Exception as e:
        print(f"Неожиданная ошибка для {model}: {e}")
        return {
            "model": model,
            "response": f"Неожиданная ошибка: {e}",
            "reasoning_present": False,
            "status_code": -3
        }

def make_gigachat_request():
    """Выполняет запрос к GigaChat API и возвращает результаты."""
    model_name = "giga-chat"
    try:
        print(f"=== Запрос для модели {model_name} (GigaChat) ===")
        response = giga.chat(prompt)
        content = response.choices[0].message.content
        reasoning_present = False 
        
        print(f"Ответ: {content}")
        print(f"Reasoning details присутствуют: {reasoning_present}")
        
        return {
            "model": model_name,
            "response": content,
            "reasoning_present": reasoning_present,
            "status_code": 200
        }
            
    except Exception as e:
        print(f"Ошибка для {model_name}: {e}")
        return {
            "model": model_name,
            "response": f"Ошибка: {e}",
            "reasoning_present": False,
            "status_code": -3
        }

def save_to_csv(results):
    """Сохраняет результаты в CSV-файл."""
    if not results:
        print("Нет данных для сохранения.")
        return
    
    with open(CSV_FILE, 'w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=['model', 'status_code', 'reasoning_present', 'response'])
        writer.writeheader()
        writer.writerows(results)
    
    print(f"Результаты сохранены в {CSV_FILE}")

if __name__ == "__main__":
    all_results = []
    
    # Обработка OpenRouter моделей
    for model in OPENROUTER_MODELS:
        result = make_openrouter_request(model)
        all_results.append(result)
    
    # Обработка GigaChat
    gigachat_result = make_gigachat_request()
    all_results.append(gigachat_result)
    
    save_to_csv(all_results)
