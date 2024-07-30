import socket
import json
import logging
import subprocess

# Настройка логирования
logging.basicConfig(filename='example.log', encoding='utf-8', level=logging.DEBUG)

# Создаем сокет и привязываем его к публичному хосту и порту
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind(('0.0.0.0', 9091))
s.listen(1)

# Подготовим Whitelist для WebHook из-за проверки компаний информационной безопасности
whitelist = ['158.160.126.144', '51.250.16.54', '85.140.0.29']

# Путь к скрипту для обновления продакшн контейнера
prod_commands = [
    "docker stop credit-calc-main",
    "docker rm credit-calc-main",
    "docker pull simpleaddress.ru:5050/do-2/credit-devops-calc",
    "docker tag simpleaddress.ru:5050/do-2/credit-devops-calc:latest credit-calc:latest | docker image rm simpleaddress.ru:5050/do-2/credit-devops-calc:latest",
    "docker run --name credit-calc-main -d -p 30026:80 credit-calc"
]

# Путь к скрипту для обновления тестового контейнера
test_commands = [
    "docker stop credit-calc-test",
    "docker rm credit-calc-test",
    "docker pull simpleaddress.ru:5050/do-2/credit-devops-calc:test",
    "docker tag simpleaddress.ru:5050/do-2/credit-devops-calc:test credit-calc-test:test | docker image rm simpleaddress.ru:5050/do-2/credit-devops-calc:test",
    "docker run --name credit-calc-test -d -p 30027:80 credit-calc-test:test"
]

# Функция для выполнения списка команд
def execute_commands(commands):
    for command in commands:
        logging.info(f"Executing command: {command}")
        try:
            result = subprocess.run(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if result.returncode == 0:
                logging.info(f"Command executed successfully: {result.stdout}")
                conn.send(b"HTTP/1.1 200 OK\r\n\r\n")  # Отправляем HTTP-ответ "200 OK"
            else:
                logging.error(f"Error executing command: {result.stderr}")
        except Exception as e:
            logging.error(f"Exception occurred while executing command: {e}")

while True:
    # Принимаем подключение
    conn, addr = s.accept()
    # Получаем данные из подключения
    data = conn.recv(1024)
    request = data.decode()
    
    # Выводим raw-запрос в логи
    # logging.warning(f"Raw request: {request}")
    
    # IP-адрес есть в whitelist, обрабатываем запрос
    if addr[0] in whitelist:
        try:
            # Разбираем JSON данные из запроса
            headers, body = request.split('\r\n\r\n', 1)
            # Декодируем JSON данные из тела запроса
            json_data = json.loads(body)
            # Получаем текущую ветку из JSON-объекта
            current_branch = json_data.get("environment", "")
            
            # Определяем среду в зависимости от текущей ветки
            if current_branch == "production":
                execute_commands(prod_commands)
            elif current_branch == "testing":
                execute_commands(test_commands)
            else:
                logging.warning("Unsupported environment data")
                conn.send(b"HTTP/1.1 400 Bad Request\r\n")
        except json.JSONDecodeError:
            logging.error("Error decoding JSON data")
            conn.send(b"HTTP/1.1 400 Bad Request\r\n")
    else:
        logging.warning(f"IP address {addr[0]} is not in whitelist")
        conn.send(b"HTTP/1.1 403 Forbidden\r\n")

    # Закрываем соединение
    conn.close()
