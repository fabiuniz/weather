from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import os
import requests
from flask_cors import CORS
import time # Importa o módulo time

load_dotenv()
app = Flask(__name__)
CORS(app)

API_NINJAS_KEY = os.getenv("API_NINJAS_KEY")
if not API_NINJAS_KEY:
    print("Erro: A chave da API não foi configurada. Defina a variável de ambiente API_NINJAS_KEY.")
    exit()

# Dicionário para armazenar o cache: {cidade: {'data': dados_api, 'timestamp': tempo_consulta}}
cache_de_qualidade_do_ar = {}
TEMPO_DE_CACHE = 3600  # Tempo em segundos (1 hora) para o cache

# Rota para a raiz do servidor (http://localhost:5000/)
@app.route('/')
def serve_root_index():
    # Use render_template para carregar o HTML da pasta 'templates'
    return render_template('index.html')

# Rota específica para http://localhost:5000/index.html
@app.route('/index.html')
def serve_specific_index():
    # Também use render_template aqui
    return render_template('index.html')


@app.route('/airquality', methods=['GET'])
def get_air_quality():
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "Parâmetro 'city' é obrigatório"}), 400

    # Normaliza o nome da cidade para o cache (ex: "sao paulo" vs "São Paulo")
    city_normalized = city.lower()

    # Verifica se a cidade está no cache e se o cache ainda é válido
    if city_normalized in cache_de_qualidade_do_ar:
        dados_cache = cache_de_qualidade_do_ar[city_normalized]
        if (time.time() - dados_cache['timestamp']) < TEMPO_DE_CACHE:
            print(f"Retornando dados para '{city}' do cache.")
            return jsonify(dados_cache['data'])

    # Se não estiver no cache ou se o cache expirou, faz a requisição
    url = f"https://api.api-ninjas.com/v1/airquality?city={city}"
    headers = {"X-Api-Key": API_NINJAS_KEY}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() # Lança um erro para status de resposta HTTP 4xx/5xx

        # A API Ninjas retorna um dicionário vazio {} para cidades não encontradas.
        # Precisamos verificar se a resposta JSON não está vazia.
        dados = response.json()
        if not dados: # Se o dicionário de dados estiver vazio
            return jsonify({"error": "Cidade não encontrada na API externa."}), 404

        # Armazena a resposta no cache
        cache_de_qualidade_do_ar[city_normalized] = {'data': dados, 'timestamp': time.time()}
        print(f"Dados para '{city}' obtidos da API externa e armazenados em cache.")
        return jsonify(dados)
    except requests.exceptions.HTTPError as http_err:
        print(f"Erro HTTP ao acessar a API externa para '{city}': {http_err}")
        # Retorna o status code original da API externa se for um 404 ou 401/403
        if response.status_code == 404:
            return jsonify({"error": "Cidade não encontrada na API externa."}), 404
        elif response.status_code in [401, 403]:
            return jsonify({"error": "Erro de autenticação ou permissão com a API externa."}), response.status_code
        else:
            return jsonify({"error": f"Erro na API externa: {response.status_code} - {response.text}"}), response.status_code
    except requests.exceptions.ConnectionError as conn_err:
        print(f"Erro de conexão ao acessar a API externa para '{city}': {conn_err}")
        return jsonify({"error": "Não foi possível conectar à API externa. Verifique sua conexão."}), 500
    except requests.exceptions.Timeout as timeout_err:
        print(f"Timeout ao acessar a API externa para '{city}': {timeout_err}")
        return jsonify({"error": "A API externa demorou muito para responder."}), 504
    except requests.exceptions.RequestException as e:
        print(f"Erro inesperado ao acessar a API externa para '{city}': {e}")
        return jsonify({"error": "Erro ao obter dados da qualidade do ar."}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)