// Функция для экспорта таблицы в PDF
function exportToPDF() {
    // Получаем таблицу
    const table = document.querySelector('table');

    // Проверяем, что таблица найдена
    if (table) {
        // Используем html2pdf для преобразования HTML в PDF
        html2pdf().from(table).save("table.pdf");
    } else {
        console.error('Table not found!');
    }
}

// Обработчик события для кнопки экспорта в CSV
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('export-csv-btn').addEventListener('click', function() {
        const table = document.getElementById('payment-table');
        if (table) {
            let csv = 'Месяц,Сумма выплаты,Остаток задолженности\r\n'; // Используем \r\n вместо \n для новой строки, чтобы это было понятно Excel
            // Перебираем строки таблицы
            table.querySelectorAll('tr').forEach(function(row) {
                // Извлекаем текст из ячеек текущей строки
                const cells = Array.from(row.querySelectorAll('td, th')).map(cell => {
                    let content = cell.textContent.trim();
                    // Если текст содержит запятую или кавычки, заключаем его в кавычки и экранируем кавычки внутри текста
                    if (content.includes(',') || content.includes('"')) {
                        content = '"' + content.replace(/"/g, '""') + '"';
                    }
                    return content;
                });
                // Формируем CSV строку для текущей строки с явным разделением запятыми
                csv += cells.join(',') + '\r\n'; // Используем \r\n вместо \n для новой строки, чтобы это было понятно Excel
            });

            // Создаем файл CSV и предлагаем его для скачивания
            const blob = new Blob([csv], {
                type: 'text/csv;charset=utf-8;'
            }); // Используем utf-8 кодировку
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'table.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('Экспорт не поддерживается в этом браузере.');
            }
        } else {
            console.error('Таблица не найдена!');
        }
    });
});

// Прикрепляем обработчик события submit к форме с id 'loan-form'
document.getElementById('loan-form').addEventListener('submit', function(e) {
    // Предотвращаем стандартное поведение формы
    e.preventDefault();

    // Получаем значения полей формы
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const middleName = document.getElementById('middle-name').value;
    const passport = document.getElementById('passport').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const term = parseFloat(document.getElementById('term').value);
    const interestRate = parseFloat(document.getElementById('percent').value);

    // Задаем процентную ставку
    // const interestRate = 0.05;

    // Рассчитываем ежемесячную процентную ставку и количество платежей
    const monthlyInterestRate = interestRate / 1200;
    const numPayments = term;

    // Рассчитываем ежемесячный платеж и общую сумму платежей и переплату
    const monthlyPayment = (amount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numPayments));
    const totalPayment = monthlyPayment * numPayments;
    const overpayment = totalPayment - amount

    // Обновляем отображение ежемесячного и общего платежей
    document.getElementById('monthly-payment').textContent = monthlyPayment.toFixed(2);
    document.getElementById('total-payment').textContent = totalPayment.toFixed(2);
    document.getElementById('loan-form').style.display = 'none'; // Скрываем форму
    document.getElementById('results').style.display = 'block'; // Отображаем блок результатов

    // Очищаем таблицу платежей перед созданием новых записей
    const paymentTableBody = document.getElementById('payment-table-body');
    paymentTableBody.innerHTML = '';

    // Инициализируем переменную оставшегося баланса равной сумме займа
    let remainingBalance = amount;
    // Создаем записи для каждого месяца платежей
    for (let month = 1; month <= term; month++) {
        const monthlyInterest = remainingBalance * monthlyInterestRate; // Рассчитываем ежемесячные проценты
        const principalPayment = monthlyPayment - monthlyInterest; // Рассчитываем сумму платежа по основному долгу
        remainingBalance -= principalPayment; // Обновляем оставшийся баланс

        // Создаем и заполняем строку таблицы для текущего месяца
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${month}</td>
            <td>${monthlyPayment.toFixed(2)}</td>
            <td>${remainingBalance.toFixed(2)}</td>
        `;
        paymentTableBody.appendChild(row); // Добавляем строку в таблицу
    }

    // Добавляем обработчик события для кнопки скрытия результатов
    document.getElementById('hide-results').addEventListener('click', function() {
        document.getElementById('loan-form').style.display = 'block'; // Показываем форму
        document.getElementById('results').style.display = 'none'; // Скрываем блок результатов
    });
    
    // Анимация для отображения результатов
    const results = document.getElementById('results');
    results.style.display = 'block'; // Отображаем блок результатов
    results.classList.add('fadeIn'); // Добавляем класс анимации
});