# atividade-rabbitMQ-dupla

## Dupla de projeto - Pedro Rico e Lucas Miralha

## Pedido Listener - Trabalho de Mensageria (2º ano CC)

**O que é:** Consumer RabbitMQ em Node.js que escuta a fila `queue_pedido`, valida JSON e persiste em 3 tabelas PostgreSQL (`pedido`, `item_pedido`, `evento_pedido`).

## Estrutura
```
pedido-listener/
├── compose.yml          # RabbitMQ + PostgreSQL + App
├── Dockerfile
├── package.json
├── init.sql             # Cria as 3 tabelas
├── .env.example
└── src/
    ├── config/          # .env + validação
    ├── rabbitmq/        # Conexão AMQP + topologia (exchange/queue/binding)
    ├── db/              # Pool PG + queries transacionais
    ├── consumer/        # Listener com ACK/NACK manual
    ├── utils/           # Logger
    └── index.js         # Main + graceful shutdown
```

## Como rodar
```bash
cd pedido-listener
docker compose up -d
docker compose logs -f app
```

## Testar
Painel RabbitMQ: http://localhost:15672 (admin/admin)  
Exchange: `exchange_pedido` → Routing key: `routing_key_pedido` → Content-Type: `application/json` → Payload:
```json
{"eventId":"uuid","tipoEvento":"PEDIDO_CRIADO","ocorridoEm":"2026-09-28T14:30:00Z","pedidoId":123,"itens":[{"produtoId":10,"quantidade":2}]}
```