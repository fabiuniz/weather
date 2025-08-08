const urlserver = "http://localhost:5000/airquality"; // Altere para o endereço do seu servidor
let myChart; // Variável para armazenar a instância do Chart.js

async function consultarAr() {
    const cidadeInput = document.getElementById("cidade");
    const cidade = cidadeInput.value.trim();
    const resultado = document.getElementById("resultado");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const chartCanvas = document.getElementById("airQualityChart");

    if (!cidade) {
        resultado.innerHTML = "Por favor, digite uma cidade.";
        chartCanvas.style.display = 'none'; // Esconde o gráfico
        return;
    }

    resultado.innerHTML = ""; // Limpa resultados anteriores
    loadingSpinner.style.display = 'block'; // Mostra o spinner
    chartCanvas.style.display = 'none'; // Esconde o gráfico enquanto busca

    try {
        const resposta = await fetch(`${urlserver}?city=${cidade}`);

        if (resposta.status === 200) {
            const dados = await resposta.json();
            
            let htmlContent = `
                <h3>Qualidade do ar em <strong>${cidade}</strong></h3>
                <p><strong>Índice Geral (AQI):</strong> ${dados.overall_aqi} — quanto menor, melhor.</p>
                <p><strong>Partículas finas (PM2.5):</strong> ${dados["PM2.5"].concentration} μg/m3
                <br><em>Classificação:</em> ${classificarPM25(dados["PM2.5"].concentration)}
                <br><small>Essas partículas penetram nos pulmões e podem afetar a saúde respiratória.</small></p>
                <p><strong>Dióxido de Nitrogênio (NO2):</strong> ${dados["NO2"].concentration} μg/m3
                <br><em>Classificação:</em> ${classificarNO2(dados["NO2"].concentration)}
                <br><small>Gás comum em áreas urbanas com tráfego intenso. Pode causar irritações.</small></p>
                <p><strong>Ozônio ao nível do solo (O3):</strong> ${dados["O3"].concentration} μg/m3
                <br><em>Classificação:</em> ${classificarO3(dados["O3"].concentration)}
                <br><small>Em excesso, pode causar desconforto respiratório e afetar grupos sensíveis.</small></p>
                <p><strong>Recomendações:</strong><br>${gerarRecomendacoes(dados)}</p>
            `;
            resultado.innerHTML = htmlContent;

            // Destruir gráfico anterior se existir
            if (myChart) {
                myChart.destroy();
            }

            // Renderizar o novo gráfico
            const ctx = chartCanvas.getContext('2d');
            myChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['PM2.5', 'NO2', 'O3'],
                    datasets: [{
                        label: 'Concentração (μg/m3)',
                        data: [
                            dados["PM2.5"].concentration,
                            dados["NO2"].concentration,
                            dados["O3"].concentration
                        ],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)', // Vermelho
                            'rgba(54, 162, 235, 0.6)', // Azul
                            'rgba(255, 206, 86, 0.6)'  // Amarelo
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: false // Oculta a legenda para datasets únicos
                        }
                    }
                }
            });
            chartCanvas.style.display = 'block'; // Mostra o gráfico
        } else if (resposta.status === 400) {
             const erro = await resposta.json();
             resultado.innerHTML = `Erro: ${erro.error}`;
        } else if (resposta.status === 404) {
            resultado.innerHTML = "Cidade não encontrada. Verifique o nome e tente novamente.";
        }
        else {
            resultado.innerHTML = "Ocorreu um erro ao consultar a qualidade do ar. Tente novamente mais tarde.";
        }
    } catch (erro) {
        resultado.innerHTML = "Erro ao conectar-se com o servidor. Verifique sua conexão ou tente mais tarde.";
        console.error("Erro na requisição:", erro);
    } finally {
        loadingSpinner.style.display = 'none'; // Esconde o spinner
    }
}

// Funções de classificação permanecem as mesmas
function classificarPM25(valor) {
    if (valor <= 12) return "ÓTIMO";
    if (valor <= 35.4) return "REGULAR";
    return "RUIM";
}
function classificarNO2(valor) {
    if (valor <= 100) return "ÓTIMO";
    if (valor <= 200) return "REGULAR";
    return "RUIM";
}
function classificarO3(valor) {
    if (valor <= 120) return "ÓTIMO";
    if (valor <= 180) return "REGULAR";
    return "RUIM";
}

// Nova função para gerar recomendações
function gerarRecomendacoes(dados) {
    let recomendacoes = [];

    // Recomendação geral baseada no AQI
    if (dados.overall_aqi >= 150) { // Exemplo de AQI ruim
        recomendacoes.push("A qualidade do ar está perigosa. **Evite atividades ao ar livre**.");
    } else if (dados.overall_aqi >= 100) { // Exemplo de AQI regular
        recomendacoes.push("A qualidade do ar não está ideal. **Grupos sensíveis devem reduzir a exposição**.");
    }

    // Recomendações específicas por poluente
    const pm25Class = classificarPM25(dados["PM2.5"].concentration);
    if (pm25Class === "RUIM") {
        recomendacoes.push("Devido aos altos níveis de PM2.5, **considere usar máscara e fechar janelas**.");
    }

    const no2Class = classificarNO2(dados["NO2"].concentration);
    if (no2Class === "RUIM") {
        recomendacoes.push("Evite áreas de tráfego intenso por longos períodos devido ao NO2.");
    }

    const o3Class = classificarO3(dados["O3"].concentration);
    if (o3Class === "RUIM") {
        recomendacoes.push("Em dias ensolarados, o Ozônio está alto. **Evite exercícios extenuantes ao ar livre**.");
    }

    if (recomendacoes.length === 0) {
        recomendacoes.push("A qualidade do ar está boa. Aproveite o ar livre!");
    }

    return recomendacoes.map(rec => `<li>${rec}</li>`).join(''); // Formata como lista HTML
}

// Autocompletar básico com uma lista predefinida (pode ser expandida ou vir de uma API)
document.addEventListener("DOMContentLoaded", () => {
    const cidadesConhecidas = [
        "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre",
        "Brasília", "Salvador", "Fortaleza", "Recife", "Manaus",
        "Nova York", "Londres", "Paris", "Tóquio", "Pequim", "Berlim", "Roma", "Madri"
    ];
    const datalist = document.getElementById("cidadesSugestoes");
    cidadesConhecidas.forEach(cidade => {
        const option = document.createElement("option");
        option.value = cidade;
        datalist.appendChild(option);
    });
});

// Opcional: Preencher a cidade com a localização do usuário (requer API de geocodificação)
// Lembre-se de obter uma chave para a API de geocodificação, como OpenCage ou Nominatim
/*
function preencherCidadePorLocalizacao() {
    const cidadeInput = document.getElementById("cidade");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const geoApiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=SUA_CHAVE_OPENCAGE`;

            try {
                const response = await fetch(geoApiUrl);
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    const cidadeDetectada = data.results[0].components.city || data.results[0].components.town || data.results[0].components.village;
                    if (cidadeDetectada) {
                        cidadeInput.value = cidadeDetectada;
                    }
                }
            } catch (error) {
                console.error("Erro ao obter cidade pela geolocalização:", error);
            }
        }, (error) => {
            console.warn("Erro ao obter localização: " + error.message);
        });
    } else {
        console.log("Geolocalização não é suportada pelo seu navegador.");
    }
}
// Descomente a linha abaixo para habilitar a geolocalização
// document.addEventListener("DOMContentLoaded", preencherCidadePorLocalizacao);
*/