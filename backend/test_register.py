import json
import urllib.request
import urllib.error

url = 'http://127.0.0.1:8000/auth/register'
data = json.dumps({
    'nombre_completo': 'Juan Pérez',
    'email': 'testusuario5@gmail.com',
    'password': 'secret123',
    'rol': 'postulante'
}).encode('utf-8')

req = urllib.request.Request(
    url,
    data=data,
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req) as res:
        print(res.status)
        print(res.read().decode())
except urllib.error.HTTPError as e:
    print('HTTP', e.code)
    print(e.read().decode())
except Exception as e:
    print('ERR', e)
