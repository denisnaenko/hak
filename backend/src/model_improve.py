import requests
import json
import os

# Конфигурация для OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or "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"
OPENROUTER_MODEL = "deepseek/deepseek-r1-0528-qwen3-8b"


def make_openrouter_request(model, text):
    """Выполняет запрос к OpenRouter API для указанной модели и возвращает результаты."""
    try:
        print(f"=== Запрос для модели {OPENROUTER_MODEL} (OpenRouter) ===")
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
                        "content": text
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

def improve_analysis_with_user_query(models_analysis_results, user_query):
    """
    Улучшает анализ на основе запроса пользователя.
    
    Args:
        models_analysis_results: Список результатов анализа от моделей
        user_query: Запрос пользователя для уточнения/улучшения анализа
    
    Returns:
        Словарь с результатом улучшенного анализа
    """
    analysis_text = ''.join(models_analysis_results)
    
    prompt = f"""
Роль (Role)
Ты — продуктовый аналитик. Твоя задача — улучшить и дополнить существующий анализ на основе запроса пользователя.

Контекст (Context)
Ты получаешь на вход:
1. Результаты анализа от трех AI-моделей
2. Запрос пользователя, который хочет уточнить или улучшить анализ

Задача (Goal)
На основе существующего анализа и запроса пользователя создать улучшенный и более детальный ответ, который:
- Учитывает все данные из исходного анализа
- Отвечает на конкретный запрос пользователя
- Предоставляет дополнительную информацию, если это необходимо
- Сохраняет структурированность и читаемость

Процесс (Action Steps)
1. Внимательно изучи исходный анализ от всех трех моделей
2. Пойми, что именно хочет узнать пользователь из своего запроса
3. Используй информацию из анализа для ответа на запрос
4. Если в анализе нет нужной информации, укажи это, но попробуй дать полезный ответ на основе имеющихся данных
5. Структурируй ответ так, чтобы он был понятен и полезен

Формат Вывода (Output Format)
Ответ должен быть структурированным и понятным. Используй форматирование для улучшения читаемости. Избегай использования нечитаемых символов (стикеры, рисунки, разметки).

ИСХОДНЫЙ АНАЛИЗ:
{analysis_text}

ЗАПРОС ПОЛЬЗОВОВАТЕЛЯ:
{user_query}

УЛУЧШЕННЫЙ ОТВЕТ:
"""
    
    improved_result = make_openrouter_request(OPENROUTER_MODEL, prompt)
    
    return improved_result

