# Frontend (Angular) — E-commerce

Stack atual: Angular (projeto já presente em /frontend)

Quickstart
1. cd frontend
2. npm install
3. ng serve --open

Configurar API
- A variável de ambiente (environment.ts) deve apontar para a URL da API (ex: https://api.example.com)
- Consumir endpoints descritos em backend/openapi.yaml

Recomendações
- Usar HttpInterceptor para injetar Authorization header (Bearer token)
- Reutilizar componentes e estilos quando possível; separar features (catalog, cart, checkout, account)
