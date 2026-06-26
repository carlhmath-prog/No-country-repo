import json
import urllib.request
import urllib.error
import random

email = f"juan{random.randint(1000,9999)}@example.com"
url = 'http://127.0.0.1:8000/auth/register'
data = json.dumps({
    'nombre_completo': 'Juan Pérez',
    'email': email,
    'password': 'secret123',
    'rol': 'postulante'
}).encode('utf-8')

req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as res:
        print('STATUS', res.status)
        print(res.read().decode())
except urllib.error.HTTPError as e:
    print('HTTP', e.code)
    print(e.read().decode())
except Exception as e:
    print('ERR', type(e).__name__, e)
