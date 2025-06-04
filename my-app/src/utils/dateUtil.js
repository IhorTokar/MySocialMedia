export const formatDate = (dateString, options = {}) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return ""; // Перевірка на валідну дату

    if (options.timeOnly) {
      // Форматуємо час, наприклад, 14:30
      return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    
    // Ваша існуюча логіка форматування повної дати або інша логіка
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (options.dateOnly) {
      return `${day}.${month}.${year}`;
    }

    // Приклад формату "25 трав. о 14:30" або "Вчора о 14:30" або "14:30", якщо сьогодні
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return `Сьогодні о ${hours}:${minutes}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
        return `Вчора о ${hours}:${minutes}`;
    } else if (year === today.getFullYear()) {
        // Формат "25 трав." без року, якщо поточний рік
        const monthName = date.toLocaleDateString('uk-UA', { month: 'short' }).replace('.', '');
        return `${day} ${monthName} о ${hours}:${minutes}`;
    } else {
        return `${day}.${month}.${year} о ${hours}:${minutes}`;
    }

  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return ""; // Повертаємо порожній рядок у разі помилки
  }
};