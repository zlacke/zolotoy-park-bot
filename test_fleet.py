import paramiko

key = paramiko.RSAKey.from_private_key_file(r'C:\Users\Мерзляковы\.ssh\id_rsa_taxi')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('138.16.226.236', username='root', pkey=key, timeout=30)

cmds = [
    ('IPv6 interfaces', 'ip -6 addr show'),
    ('IPv6 routes', 'ip -6 route show'),
    ('IPv6 sysctl', 'sysctl net.ipv6.conf.all.disable_ipv6 net.ipv6.conf.default.disable_ipv6'),
    ('IPv6 enabled?', 'cat /proc/sys/net/ipv6/conf/all/disable_ipv6'),
    ('Ping6 Google', 'ping6 -c 2 -W 3 ipv6.google.com 2>&1'),
    ('Ping6 Yandex', 'ping6 -c 2 -W 3 2a02:6b8:0:3400:0:71d:0:1c8 2>&1'),
    ('Curl6 test', 'curl -6 -s -o /dev/null -w "%{http_code}" --connect-timeout 5 https://ipv6.google.com/ 2>&1'),
]

for label, cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    out = stdout.read().decode().strip()
    print(f'=== {label} ===')
    print(out[:500])
    print()

ssh.close()
