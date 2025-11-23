import { useState, useEffect } from "react";

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

function App() {
  const [openSections, setOpenSections] = useState({
    cardType: true,
    banks: true,
    criteria: true,
  });

  const [selected, setSelected] = useState({
    cardType: [] as string[],
    banks: [] as string[],
    criteria: [] as string[],
  });

  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCheckboxChange = (
    category: keyof typeof selected,
    value: string,
    isDisabled: boolean = false
  ) => {
    if (isDisabled) return;

    setSelected((prev) => {
      const current = prev[category];
      if (current.includes(value)) {
        return { ...prev, [category]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [category]: [...current, value] };
      }
    });
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
          AI Assistant for banking
        </h1>
      </header>

      <main className="w-full max-w-7xl">
        <div className="flex gap-6 min-h-screen">
          {/* === ЛЕВЫЙ ФРЕЙМ — ФИЛЬТРЫ === */}
          <div className="w-96 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
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
                      ].map((bank) => (
                        <label
                          key={bank}
                          className="flex items-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition"
                        >
                          <input
                            type="checkbox"
                            checked={selected.banks.includes(bank)}
                            onChange={() => handleCheckboxChange("banks", bank)}
                            className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-4 text-gray-700">{bank}</span>
                        </label>
                      ))}
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
                    <p className="text-gray-800">
                      Привет! Я подготовил сравнение по выбранным параметрам...
                    </p>
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
                                const mockValue = (() => {
                                  const examples: Record<string, string[]> = {
                                    "Стоимость обслуживания(дебетовая)": ["Бесплатно", "99 ₽/мес", "0 ₽ при тратах > 10к"],
                                    "Стоимость обслуживания(кредитная)": ["0 ₽ первый год", "590 ₽/мес", "Бесплатно при тратах > 15к"],
                                    "СМС-уведомления": ["59 ₽/мес", "Бесплатно", "69 ₽/мес"],
                                    "Снятие наличных в других банках": ["1%, мин. 290 ₽", "Бесплатно до 100к", "2%, мин. 399 ₽"],
                                    "Процент на остаток": ["до 12%", "до 10%", "до 14%"],
                                    "Кредитный лимит": ["до 1 500 000 ₽", "до 1 000 000 ₽", "до 700 000 ₽"],
                                    "Льготный период": ["до 120 дней", "до 110 дней", "до 55 дней"],
                                    "Процентные ставки": ["от 19,9%", "от 17,9%", "от 23,9%"],
                                    "Программа лояльности": ["Кэшбэк до 30%", "Баллы 1%–10%", "Мили 1,5 за 100 ₽"],
                                  };

                                  const pool = examples[criterion] || ["—", "Есть", "Нет", "Зависит от условий"];
                                  return pool[Math.floor(Math.random() * pool.length)];
                                })();

                                return (
                                  <td
                                    key={bank}
                                    className="px-8 py-5 text-center text-gray-700 min-w-[180px] whitespace-nowrap"
                                  >
                                    {mockValue}
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
                              data: selected.banks.map(() =>
                                Math.round(Math.random() * 900 + 100)
                              ),
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