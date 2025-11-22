import { useState, useEffect } from "react";

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
              !["Кредитный лимит", "Льготный период", "Первоначальный взнос"].includes(c)
          );
        }

        if (isOnlyCredit) {
          newCriteria = newCriteria.filter(
            (c) =>
              ![
                "СМС-уведомления",
                "Снятие наличных в других трьох банках",
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
      return ["Кредитный лимит", "Льготный период", "Первоначальный взнос"].includes(
        criterion
      );
    }
    if (isOnlyCredit) {
      return [
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

  const handleCompare = () => {
    if (!isButtonDisabled) {
      setIsComparisonMode(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-100">
        <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 text-center">
            AI Assistant for banking
            </h1>
        </header>
        <main>
        <div className="min-h-screen bg-gray-100 flex flex-col">
        <div
            className={`flex-1 flex transition-all duration-500 ease-in-out ${
            isComparisonMode
                ? "justify-start gap-6 p-6"
                : "justify-center items-center p-6"
            }`}
        >
            <div
            className={`${
                isComparisonMode
                ? "w-96 space-y-6"
                : "w-full max-w-lg"
            } transition-all duration-500`}
            >
            <div className="space-y-6 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
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
                        "Стоимость обслуживания",
                        "СМС-уведомлени",
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

                <div className="px-8 pb-8">
                <button
                    onClick={handleCompare}
                    disabled={isButtonDisabled}
                    className={`w-full py-5 text-xl font-semibold rounded-2xl transition-all shadow-lg ${
                    isButtonDisabled
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 active:scale-95 text-white"
                    }`}
                >
                    Сравнить продукты
                </button>
                </div>
            </div>
            </div>

            {isComparisonMode && (
            <div className="flex-1 max-w-2xl mx-4 bg-white rounded-2xl shadow-xl flex flex-col h-[85vh]">
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
            )}

            {isComparisonMode && (
            <div className="w-96 space-y-6">
                <div className="bg-white rounded-2xl shadow-xl p-6 h-[45vh] overflow-auto">
                <h3 className="text-xl font-bold mb-4">Таблица сравнения</h3>
                <p className="text-gray-500 text-center">Таблица загружается...</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 h-[38vh]">
                <h3 className="text-xl font-bold mb-4">График</h3>
                <p className="text-gray-500 text-center">График загружается...</p>
                </div>
            </div>
            )}
        </div>
        </div>
        </main>
    </div>
  );
}

export default App;