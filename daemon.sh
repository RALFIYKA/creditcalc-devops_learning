#!/bin/bash

# Путь к файлу журнала
LOG_FILE="/home/do-2-user1/credit-devops-calc/example.log"

# Путь к Python-скрипту
PYTHON_SCRIPT="/home/do-2-user1/credit-devops-calc/fetcherhook.py"

# Максимальное количество строк в журнале
MAX_LINES=2000

# Проверяем, существует ли файл журнала, и если нет, создаем его
touch "$LOG_FILE"

# Выводим сообщение о начале работы демона
echo "[$(date +"%Y-%m-%d %T")] Starting the daemon to monitor running processes..." >> "$LOG_FILE"

# Установка времени для сбора данных (5 минут)
DATA_COLLECTION_TIME=300

# Установка времени для записи данных в лог файл (2 часа)
LOG_WRITE_TIME=$((2 * 60 * 60))

# Переменная для хранения времени последней записи в лог файл
last_log_write=$(date +"%s")

# Переменная для списка времени остановок и перезапусков для контейнеров
container_stop_restart_list=()

while true; do
    current_time=$(date +"%Y-%m-%d %T")

    # Проверяем процесс Python для вебхука
    if ! ps aux | grep -v grep | grep fetcherhook.py > /dev/null
    then
        echo "$current_time - Python process for $PYTHON_SCRIPT is not running, restarting..." >> "$LOG_FILE"
        nohup python3 "$PYTHON_SCRIPT" &
        container_stop_restart_list+=("$current_time - Python process for $PYTHON_SCRIPT is restarted")
    fi

    # Проверяем контейнеры credit-calc и credit-calc-test
    if ! docker ps -a | grep "credit-calc-main" > /dev/null
    then
        echo "$current_time - Container credit-calc is not running or does not exist, restarting..." >> "$LOG_FILE"
        docker run --name credit-calc-main -d -p 30026:80 credit-calc
        container_stop_restart_list+=("$current_time - Container credit-calc is restarted")
    fi

    if ! docker ps -a | grep "credit-calc-test" > /dev/null
    then
        echo "$current_time - Container credit-calc-test is not running or does not exist, restarting..." >> "$LOG_FILE"
        docker run --name credit-calc-test -d -p 30027:80 credit-calc:test
        container_stop_restart_list+=("$current_time - Container credit-calc-test is restarted")
    fi

    # Проверяем, прошло ли достаточно времени для записи данных в лог файл
    current_time_seconds=$(date +"%s")
    if [ $((current_time_seconds - last_log_write)) -ge $LOG_WRITE_TIME ]
    then
        # Сбрасываем время последней записи в лог файл
        last_log_write=$current_time_seconds

        # Выводим список остановок и перезапусков контейнеров в лог файл
        echo "---------------------------------------" >> "$LOG_FILE"
        echo "$current_time - Container stop and restart list after 2 hours:" >> "$LOG_FILE"
        for i in "${container_stop_restart_list[@]}"
        do
            echo "$i" >> "$LOG_FILE"
        done
        echo "---------------------------------------" >> "$LOG_FILE"

        container_stop_restart_list=()  # Очищаем список после вывода в лог

        # Удаляем старые записи, если количество строк в журнале превышает MAX_LINES
        lines_count=$(wc -l < "$LOG_FILE")
        if [ $lines_count -gt $MAX_LINES ]
        then
            lines_to_delete=$((lines_count - MAX_LINES))
            sed -i "1,${lines_to_delete}d" "$LOG_FILE"
        fi

        # Выводим сообщение об успешной записи в файл журнала
        echo "$current_time - Logs written to $LOG_FILE" >> "$LOG_FILE"
    fi

    # Переходим к следующей проверке через 5 минут
    sleep $DATA_COLLECTION_TIME
done
