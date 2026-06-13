import paramiko, urllib.request, json, ssl

ctx = ssl.create_default_context()

key = paramiko.RSAKey.from_private_key_file(r'C:\Users\Мерзляковы\.ssh\id_rsa_taxi')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('138.16.226.236', username='root', pkey=key, timeout=30)
stdin, stdout, stderr = ssh.exec_command('grep BOT_TOKEN /opt/taxi-miniapp/.env')
token = stdout.read().decode().strip().split('=', 1)[1]

# Set menu button (web_app type = always visible at bottom)
data = json.dumps({
    "menu_button": {
        "type": "web_app",
        "text": "\U0001f680 Открыть приложение",
        "web_app": {"url": "https://zolotoybot.ru"}
    }
}).encode()

url = f'https://telegram-proxy.creador.workers.dev/bot{token}/setChatMenuButton'
req = urllib.request.Request(url, data=data, headers={
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0'
}, method='POST')

try:
    r = urllib.request.urlopen(req, timeout=15, context=ctx)
    print('Menu button:', json.loads(r.read().decode()))
except Exception as e:
    body = e.read().decode() if hasattr(e, 'read') else ''
    print(f'Error: {e}')
    if body: print(body[:300])

# Also set commands
cmds = json.dumps({
    "commands": [
        {"command": "start", "description": "Начать работу"},
        {"command": "app", "description": "Открыть приложение"},
        {"command": "help", "description": "Помощь"}
    ]
}).encode()

url2 = f'https://telegram-proxy.creador.workers.dev/bot{token}/setMyCommands'
req2 = urllib.request.Request(url2, data=cmds, headers={
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0'
}, method='POST')

try:
    r = urllib.request.urlopen(req2, timeout=15, context=ctx)
    print('Commands:', json.loads(r.read().decode()))
except Exception as e:
    body = e.read().decode() if hasattr(e, 'read') else ''
    print(f'Error: {e}')
    if body: print(body[:300])

ssh.close()
