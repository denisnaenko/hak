import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Типы для шаблонов
interface Template {
  id: string;
  name: string;
  selected: {
    cardType: string[];
    banks: string[];
    criteria: string[];
  };
  timestamp: number;
}

function App() {
  const [openSections, setOpenSections] = useState({
    cardType: true,
    banks: true,
    criteria: true,
    templates: false,
  });

  const [selected, setSelected] = useState({
    cardType: [] as string[],
    banks: ["Сбербанк"] as string[], // Сбербанк выбран по умолчанию
    criteria: [] as string[],
  });

  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplateName, setCurrentTemplateName] = useState("");
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summarizedResult, setSummarizedResult] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<Record<string, Record<string, string | boolean | number>>>({});

  // Загрузка шаблонов из localStorage при загрузке компонента
  useEffect(() => {
    const savedTemplates = localStorage.getItem('comparisonTemplates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    }
  }, []);

  // Сохранение шаблонов в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('comparisonTemplates', JSON.stringify(templates));
  }, [templates]);

  // Отладка: логируем изменения summarizedResult
  useEffect(() => {
    console.log("summarizedResult изменился:", summarizedResult ? summarizedResult.substring(0, 100) + "..." : "пусто");
  }, [summarizedResult]);

  // Функция для извлечения числового значения из строки для графика
  const extractNumericValue = (value: string | boolean | number | undefined): number => {
    if (value === false || value === null || value === undefined) {
      return 0;
    }
    
    if (typeof value === 'number') {
      return value;
    }
    
    const str = String(value).toLowerCase();
    
    // Если "бесплатно" или пусто
    if (str.includes("бесплатно") || str.trim() === "") {
      return 0;
    }
    
    // Извлекаем все числа из строки
    const numbers = str.match(/[\d.,]+/g);
    if (!numbers || numbers.length === 0) {
      return 0;
    }
    
    // Преобразуем числа, убирая пробелы и заменяя запятые на точки
    const numericValues = numbers.map(num => {
      const cleaned = num.replace(/\s/g, '').replace(',', '.');
      return parseFloat(cleaned);
    }).filter(n => !isNaN(n));
    
    if (numericValues.length === 0) {
      return 0;
    }
    
    // Если есть диапазон (например, "От 0 до 990"), берем максимум
    // Если есть процент, возвращаем его
    // Иначе берем первое число
    const maxValue = Math.max(...numericValues);
    
    // Если это процент (строка содержит %), возвращаем как есть
    if (str.includes('%')) {
      return maxValue;
    }
    
    // Для больших чисел (например, кредитный лимит) нормализуем до тысяч
    if (maxValue > 10000) {
      return maxValue / 1000; // Конвертируем в тысячи
    }
    
    return maxValue;
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCheckboxChange = (
    category: keyof typeof selected,
    value: string,
    isDisabled: boolean = false
  ) => {
    if (isDisabled) return;
    
    // Сбербанк всегда должен быть выбран и не может быть изменен
    if (category === "banks" && value === "Сбербанк") {
      return;
    }

    setSelected((prev) => {
      const current = prev[category];
      if (current.includes(value)) {
        return { ...prev, [category]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [category]: [...current, value] };
      }
    });
  };

  // Сохранение текущего выбора как шаблона
  const saveAsTemplate = () => {
    if (!currentTemplateName.trim()) {
      alert("Введите название шаблона");
      return;
    }

    if (selected.cardType.length === 0 || selected.banks.length === 0 || selected.criteria.length === 0) {
      alert("Выберите хотя бы один тип карты, банк и критерий для сохранения шаблона");
      return;
    }

    const newTemplate: Template = {
      id: Date.now().toString(),
      name: currentTemplateName.trim(),
      selected: { ...selected },
      timestamp: Date.now()
    };

    setTemplates(prev => [...prev, newTemplate]);
    setCurrentTemplateName("");
    alert(`Шаблон "${newTemplate.name}" сохранен!`);
  };

  // Загрузка шаблона
  const loadTemplate = (template: Template) => {
    setSelected(template.selected);
    alert(`Шаблон "${template.name}" загружен!`);
  };

  // Удаление шаблона
  const deleteTemplate = (templateId: string, templateName: string) => {
    if (confirm(`Удалить шаблон "${templateName}"?`)) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  // Экспорт шаблона в JSON файл
  const exportTemplate = (template: Template) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${template.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Экспорт всех шаблонов в один JSON файл
  const exportAllTemplates = () => {
    if (templates.length === 0) {
      alert("Нет шаблонов для экспорта");
      return;
    }

    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      templates: templates
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all_templates_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Импорт шаблонов из JSON файла
  const importTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        let templatesToImport: Template[] = [];
        
        // Проверяем формат файла
        if (data.templates && Array.isArray(data.templates)) {
          // Формат с несколькими шаблонами
          templatesToImport = data.templates;
        } else if (data.id && data.name && data.selected) {
          // Формат с одним шаблоном
          templatesToImport = [data];
        } else {
          throw new Error("Неверный формат файла");
        }

        // Валидация шаблонов
        const validTemplates = templatesToImport.filter(template => 
          template.id && 
          template.name && 
          template.selected && 
          template.selected.cardType && 
          template.selected.banks && 
          template.selected.criteria
        );

        if (validTemplates.length === 0) {
          throw new Error("В файле нет валидных шаблонов");
        }

        // Добавляем новые шаблоны, избегая дубликатов по ID
        setTemplates(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTemplates = validTemplates.filter(t => !existingIds.has(t.id));
          return [...prev, ...newTemplates];
        });

        alert(`Успешно импортировано ${validTemplates.length} шаблонов`);
        
        // Очищаем input
        event.target.value = '';
      } catch (error) {
        console.error('Ошибка импорта:', error);
        alert(`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    };
    reader.readAsText(file);
  };

  // Экспорт текущего сравнения в JSON
  const exportCurrentComparison = () => {
    if (isButtonDisabled) {
      alert("Нет данных для экспорта");
      return;
    }

    const comparisonData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      comparison: {
        selected,
        chartData: {
          labels: selected.banks,
          datasets: selected.criteria.map((criterion) => ({
            label: criterion,
            data: selected.banks.map(() => Math.round(Math.random() * 900 + 100))
          }))
        }
      }
    };

    const dataStr = JSON.stringify(comparisonData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparison_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const cardTypes = selected.cardType;
    const isOnlyDebit =
      cardTypes.includes("Дебетовая карта") && !cardTypes.includes("Кредитная карта");
    const isOnlyCredit =
      cardTypes.includes("Кредитная карта") && !cardTypes.includes("Дебетовая карта");

    if (isOnlyDebit || isOnlyCredit) {
      setSelected((prev) => {
        let newCriteria = [...prev.criteria];

        if (isOnlyDebit) {
          newCriteria = newCriteria.filter(
            (c) =>
              !["Стоимость обслуживания(кредитная)", "Кредитный лимит", "Льготный период", "Первоначальный взнос"].includes(c)
          );
        }

        if (isOnlyCredit) {
          newCriteria = newCriteria.filter(
            (c) =>
              ![
                "Стоимость обслуживания(дебетовая)",
                "СМС-уведомления",
                "Снятие наличных в других банках",
                "Переводы по реквизитам в другие банки",
                "Процентные ставки",
              ].includes(c)
          );
        }

        return { ...prev, criteria: newCriteria };
      });
    }
  }, [selected.cardType]);

  const isCriterionDisabled = (criterion: string) => {
    const cardTypes = selected.cardType;
    const isOnlyDebit =
      cardTypes.includes("Дебетовая карта") && !cardTypes.includes("Кредитная карта");
    const isOnlyCredit =
      cardTypes.includes("Кредитная карта") && !cardTypes.includes("Дебетовая карта");

    if (isOnlyDebit) {
      return ["Стоимость обслуживания(кредитная)", "Кредитный лимит", "Льготный период", "Первоначальный взнос"].includes(
        criterion
      );
    }
    if (isOnlyCredit) {
      return [
        "Стоимость обслуживания(дебетовая)",
        "СМС-уведомления",
        "Снятие наличных в других банках",
        "Переводы по реквизитам в другие банки",
        "Процентные ставки",
      ].includes(criterion);
    }
    return false;
  };

  const ChevronDown = ({ isOpen }: { isOpen: boolean }) => (
    <svg
      className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${
        isOpen ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );

  const isButtonDisabled =
    selected.cardType.length === 0 ||
    selected.banks.length === 0 ||
    selected.criteria.length === 0;

  const handleCompare = async () => {
    if (isButtonDisabled) return;

    setIsLoading(true);
    setSummarizedResult(""); // Сбрасываем предыдущий результат
    setComparisonData({}); // Сбрасываем данные для графика

    try {
      const response = await fetch("http://localhost:8000/api/params", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardType: selected.cardType,
          banks: selected.banks,
          criteria: selected.criteria,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при отправке данных");
      }

      const data = await response.json();
      console.log("Ответ от сервера:", data);
      console.log("Структура данных:", JSON.stringify(data, null, 2));

      // Сохраняем данные для графика и таблицы
      if (data.data?.comparisonData) {
        console.log("Получены данные для сравнения:", data.data.comparisonData);
        setComparisonData(data.data.comparisonData);
      }

      // Сохраняем результат анализа - проверяем несколько возможных путей
      let result = null;
      
      // Проверяем summarizedResult
      if (data.data?.summarizedResult) {
        result = data.data.summarizedResult;
      } else if (data.summarizedResult) {
        result = data.summarizedResult;
      } else if (data.data?.data?.summarizedResult) {
        result = data.data.data.summarizedResult;
      }
      // Также проверяем comparisonResult (на случай, если бэкенд использует другое имя)
      else if (data.data?.comparisonResult) {
        result = data.data.comparisonResult;
      } else if (data.comparisonResult) {
        result = data.comparisonResult;
      }

      // Если результат - объект, пытаемся извлечь поле response
      if (result && typeof result === 'object') {
        if (result.response) {
          result = result.response;
        } else if (result.text) {
          result = result.text;
        } else if (result.content) {
          result = result.content;
        } else {
          // Если объект, но нет известных полей, преобразуем в строку
          result = JSON.stringify(result, null, 2);
        }
      }

      if (result && (typeof result === 'string' || typeof result === 'number')) {
        const resultString = String(result).trim();
        if (resultString.length > 0) {
          // Проверяем, не является ли это заглушкой
          const placeholderTexts = [
            "Результат сравнения будет здесь",
            "Результат не получен",
            "Результат анализа не получен"
          ];
          const isPlaceholder = placeholderTexts.some(placeholder => 
            resultString.toLowerCase().includes(placeholder.toLowerCase())
          );
          
          if (isPlaceholder) {
            console.warn("Получена заглушка вместо реального результата");
            setSummarizedResult("Анализ выполняется... Пожалуйста, подождите.");
          } else {
            console.log("Найден summarizedResult:", resultString.substring(0, 100) + "...");
            setSummarizedResult(resultString);
          }
        } else {
          console.warn("summarizedResult пустой");
          setSummarizedResult("Результат анализа пуст. Попробуйте еще раз.");
        }
      } else {
        console.warn("summarizedResult не найден в ответе. Структура:", {
          status: data.status,
          hasData: !!data.data,
          dataKeys: data.data ? Object.keys(data.data) : [],
          allKeys: Object.keys(data),
          summarizedResultType: data.data?.summarizedResult ? typeof data.data.summarizedResult : 'undefined',
          summarizedResultValue: data.data?.summarizedResult
        });
        // Устанавливаем сообщение об ошибке, если результат не найден
        setSummarizedResult("Результат анализа не получен. Проверьте консоль для деталей.");
      }

      setIsComparisonMode(true);
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Не удалось отправить данные на сервер. Проверьте, запущен ли бэкенд.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-100">
      <header className="my-8">
        <h1 className="text-4xl font-bold text-gray-800 text-center">
          ИИ-Агент "Бенчмаркинг"
        </h1>
      </header>

      <main className="w-full max-w-7xl">
        <div className="flex gap-6 min-h-screen">
          {/* === ЛЕВЫЙ ФРЕЙМ — ФИЛЬТРЫ === */}
          <div className="w-96 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Сохранение шаблона */}
              <section>
                <button
                  onClick={() => toggleSection("templates")}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition"
                >
                  <h2 className="text-xl font-semibold text-gray-800">Шаблоны сравнения</h2>
                  <ChevronDown isOpen={openSections.templates} />
                </button>
                {openSections.templates && (
                  <div className="px-8 pb-6 pt-2">
                    <div className="space-y-4">
                      {/* Сохранение текущего выбора */}
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Название шаблона"
                          value={currentTemplateName}
                          onChange={(e) => setCurrentTemplateName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={saveAsTemplate}
                          disabled={!currentTemplateName.trim() || isButtonDisabled}
                          className={`w-full py-3 text-sm font-semibold rounded-lg transition-all ${
                            !currentTemplateName.trim() || isButtonDisabled
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          Сохранить текущий выбор
                        </button>
                      </div>

                      {/* Кнопки импорта/экспорта */}
                      <div className="flex gap-2">
                        <button
                          onClick={exportAllTemplates}
                          disabled={templates.length === 0}
                          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                            templates.length === 0
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                        >
                          Экспорт всех
                        </button>
                        <label className="flex-1">
                          <input
                            type="file"
                            accept=".json"
                            onChange={importTemplates}
                            className="hidden"
                          />
                          <div className="w-full py-2 text-sm font-semibold text-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer">
                            Импорт
                          </div>
                        </label>
                      </div>

                      {/* Кнопка экспорта текущего сравнения */}
                      <button
                        onClick={exportCurrentComparison}
                        disabled={isButtonDisabled}
                        className={`w-full py-2 text-sm font-semibold rounded-lg transition-all ${
                          isButtonDisabled
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-orange-600 hover:bg-orange-700 text-white"
                        }`}
                      >
                        Экспорт текущего сравнения
                      </button>

                      {/* Список сохраненных шаблонов */}
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        <p className="text-sm font-medium text-gray-700">Сохраненные шаблоны:</p>
                        {templates.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-2">
                            Нет сохраненных шаблонов
                          </p>
                        ) : (
                          templates.map((template) => (
                            <div
                              key={template.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{template.name}</p>
                                <p className="text-xs text-gray-500">
                                  {template.selected.cardType.length} типов, {template.selected.banks.length} банков, {template.selected.criteria.length} критериев
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => loadTemplate(template)}
                                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition"
                                  title="Загрузить"
                                >
                                  📥
                                </button>
                                <button
                                  onClick={() => exportTemplate(template)}
                                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                  title="Экспорт в JSON"
                                >
                                  📄
                                </button>
                                <button
                                  onClick={() => deleteTemplate(template.id, template.name)}
                                  className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                                  title="Удалить"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Остальные секции (Тип карты, Банки, Критерии) остаются без изменений */}
              {/* Тип карты */}
              <section>
                <button
                  onClick={() => toggleSection("cardType")}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition"
                >
                  <h2 className="text-xl font-semibold text-gray-800">Тип карты</h2>
                  <ChevronDown isOpen={openSections.cardType} />
                </button>
                {openSections.cardType && (
                  <div className="px-8 pb-8 pt-2">
                    <div className="space-y-5">
                      {["Дебетовая карта", "Кредитная карта"].map((type) => (
                        <label
                          key={type}
                          className="flex items-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition"
                        >
                          <input
                            type="checkbox"
                            checked={selected.cardType.includes(type)}
                            onChange={() => handleCheckboxChange("cardType", type)}
                            className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-4 text-gray-700">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Банки */}
              <section>
                <button
                  onClick={() => toggleSection("banks")}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition"
                >
                  <h2 className="text-xl font-semibold text-gray-800">
                    Банки для сравнения
                  </h2>
                  <ChevronDown isOpen={openSections.banks} />
                </button>
                {openSections.banks && (
                  <div className="px-8 pb-8 pt-2">
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        "Сбербанк",
                        "Альфа-Банк",
                        "ВТБ",
                        "Газпромбанк",
                        "Московский Кредитный Банк (МКБ)",
                        "Промсвязьбанк (ПСБ)",
                        "Райффайзенбанк",
                        "Россельхозбанк",
                        "Т-Банк",
                        "Банк ДОМ.РФ",
                        "ЮниКредит Банк",
                      ].map((bank) => {
                        const isSberbank = bank === "Сбербанк";
                        const isDisabled = isSberbank;
                        return (
                          <label
                            key={bank}
                            className={`flex items-center rounded-lg p-2 transition ${
                              isDisabled
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected.banks.includes(bank)}
                              onChange={() => handleCheckboxChange("banks", bank)}
                              disabled={isDisabled}
                              className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <span className="ml-4 text-gray-700">{bank}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Критерии */}
              <section>
                <button
                  onClick={() => toggleSection("criteria")}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition"
                >
                  <h2 className="text-xl font-semibold text-gray-800">
                    Критерии для сравнения
                  </h2>
                  <ChevronDown isOpen={openSections.criteria} />
                </button>
                {openSections.criteria && (
                  <div className="px-8 pb-8 pt-2">
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        "Стоимость обслуживания(дебетовая)",
                        "Стоимость обслуживания(кредитная)",
                        "СМС-уведомления",
                        "Снятие наличных в других банках",
                        "Переводы по реквизитам в другие банки",
                        "Процент на остаток",
                        "Кредитный лимит",
                        "Процентные ставки",
                        "Первоначальный взнос",
                        "Программа лояльности",
                      ].map((criterion) => {
                        const disabled = isCriterionDisabled(criterion);
                        return (
                          <label
                            key={criterion}
                            className={`flex items-center rounded-lg p-2 transition ${
                              disabled
                                ? "cursor-not-allowed opacity-50"
                                : "cursor-pointer hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected.criteria.includes(criterion)}
                              onChange={() =>
                                handleCheckboxChange("criteria", criterion, disabled)
                              }
                              disabled={disabled}
                              className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                            />
                            <span className="ml-4 text-gray-700">{criterion}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Кнопка сравнения */}
              <div className="px-8 pb-8">
                <button
                  onClick={handleCompare}
                  disabled={isButtonDisabled || isLoading}
                  className={`w-full py-5 text-xl font-semibold rounded-2xl transition-all shadow-lg ${
                    isButtonDisabled || isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 active:scale-95 text-white"
                  }`}
                >
                  {isLoading ? "Отправка данных..." : "Сравнить продукты"}
                </button>
              </div>
            </div>
          </div>

          {/* === ПРАВЫЙ БЛОК — только в режиме сравнения === */}
          {isComparisonMode && (
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              {/* ВЕРХНИЙ ФРЕЙМ — Чат */}
              <div className="bg-white rounded-2xl shadow-xl flex flex-col h-[45vh]">
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="bg-gray-100 rounded-lg p-4 mb-4">
                    {isLoading ? (
                      <div className="text-gray-600">
                        <p>Обработка запроса...</p>
                      </div>
                    ) : summarizedResult ? (
                      <>
                        <p className="text-gray-800 mb-2 font-semibold">
                          Привет! Я подготовил сравнение по выбранным параметрам:
                        </p>
                        <div className="text-gray-800 whitespace-pre-wrap mt-2">
                          <ReactMarkdown>{summarizedResult}</ReactMarkdown>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-600">
                        Результат анализа будет отображен здесь...
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t">
                  <input
                    type="text"
                    placeholder="Напишите ваш вопрос..."
                    className="w-full px-5 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* СРЕДНИЙ ФРЕЙМ — Таблица */}
              <div className="bg-white rounded-2xl shadow-xl p-6 overflow-hidden flex flex-col h-[400px]">
                <h3 className="text-2xl font-bold mb-6 text-gray-800">Таблица сравнения</h3>

                {isComparisonMode && selected.banks.length > 0 && selected.criteria.length > 0 ? (
                  <div className="overflow-auto flex-1">
                    <div className="min-w-full inline-block align-middle">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b-2 border-gray-200">
                            <th className="px-6 py-5 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                              Критерий / Банк
                            </th>
                            {selected.banks.map((bank) => (
                              <th
                                key={bank}
                                className="px-8 py-5 text-center font-semibold text-gray-700 min-w-[180px] whitespace-nowrap"
                              >
                                {bank}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selected.criteria.map((criterion, idx) => (
                            <tr
                              key={criterion}
                              className={`hover:bg-gray-50 transition-colors ${
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }`}
                            >
                              <td className="px-6 py-5 font-medium text-gray-800 sticky left-0 bg-inherit z-10 whitespace-nowrap min-w-[200px]">
                                {criterion}
                              </td>
                              {selected.banks.map((bank) => {
                                // Получаем значение из comparisonData
                                const value = comparisonData[criterion]?.[bank];
                                const displayValue = value !== undefined && value !== null && value !== false 
                                  ? String(value) 
                                  : "—";

                                return (
                                  <td
                                    key={bank}
                                    className="px-8 py-5 text-center text-gray-700 min-w-[180px] whitespace-nowrap"
                                  >
                                    {displayValue}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 flex-1 flex items-center justify-center">
                    <div>
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 mx-auto mb-6" />
                      <p className="text-gray-500 text-lg">
                        Выберите банки и критерии, затем нажмите «Сравнить продукты»
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* НИЖНИЙ ФРЕЙМ — График */}
              <div className="bg-white rounded-2xl shadow-xl p-6 overflow-hidden flex flex-col h-[500px]">
                <h3 className="text-xl font-bold mb-4">Сравнение по критериям</h3>

                {selected.banks.length === 0 || selected.criteria.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500 text-center">
                      Выберите банки и критерии, чтобы увидеть график
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-auto">
                    <div className="min-w-full" style={{ minWidth: `${selected.banks.length * 120}px` }}>
                      <div style={{ height: '450px', minWidth: '100%' }}>
                        <Bar
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom' as const,
                                labels: {
                                  padding: 10,
                                  font: { size: 12 },
                                  boxWidth: 15,
                                },
                              },
                              title: {
                                display: true,
                                text: 'Сравнение выбранных банков по критериям',
                                font: { size: 16, weight: 'bold' },
                                padding: 25,
                              },
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                    const criterion = selected.criteria[context.datasetIndex];
                                    const bank = selected.banks[context.dataIndex];
                                    const value = context.raw;
                                    return `${criterion}: ${value} (${bank})`;
                                  },
                                },
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: { 
                                  padding: 10,
                                  font: { size: 11 }
                                },
                                grid: {
                                  color: 'rgba(0, 0, 0, 0.1)',
                                }
                              },
                              x: {
                                ticks: {
                                  maxRotation: 45,
                                  minRotation: 45,
                                  font: { size: 11 }
                                },
                                grid: {
                                  color: 'rgba(0, 0, 0, 0.1)',
                                }
                              },
                            },
                            layout: {
                              padding: {
                                left: 10,
                                right: 10,
                                top: 10,
                                bottom: 10
                              }
                            }
                          }}
                          data={{
                            labels: selected.banks,
                            datasets: selected.criteria.map((criterion, index) => ({
                              label: criterion,
                              data: selected.banks.map((bank) => {
                                const value = comparisonData[criterion]?.[bank];
                                return extractNumericValue(value);
                              }),
                              backgroundColor: [
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(34, 197, 94, 0.8)',
                                'rgba(251, 191, 36, 0.8)',
                                'rgba(239, 68, 68, 0.8)',
                                'rgba(168, 85, 247, 0.8)',
                                'rgba(251, 146, 60, 0.8)',
                                'rgba(14, 165, 233, 0.8)',
                                'rgba(236, 72, 153, 0.8)',
                                'rgba(132, 204, 22, 0.8)',
                                'rgba(99, 102, 241, 0.8)',
                                'rgba(20, 184, 166, 0.8)',
                                'rgba(245, 158, 11, 0.8)',
                              ][index % 12],
                              borderWidth: 1,
                              borderColor: '#333',
                              borderRadius: 6,
                              maxBarThickness: 35,
                              minBarLength: 5,
                            })),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;