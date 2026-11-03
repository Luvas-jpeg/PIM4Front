"""Verifica a API publicada. Pagamento fictício exige opção e confirmação explícitas."""

import argparse
import getpass
import hashlib
import hmac
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Não encaminhar assinatura/segredo para outro destino.
        return None


def api_root(value):
    parsed = urllib.parse.urlsplit(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or not parsed.hostname.endswith(".onrender.com")
        or parsed.username
        or parsed.password
        or parsed.port
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
    ):
        raise argparse.ArgumentTypeError(
            "Use a URL raiz HTTPS da API no Render, sem /api ou outros caminhos."
        )
    return value.rstrip("/")


def request(opener, root, path, expected, body=None, signature=None):
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if signature is not None:
        headers["X-Webhook-Signature"] = signature
    req = urllib.request.Request(root + path, data=body, headers=headers)
    try:
        response = opener.open(req, timeout=120)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        status = response.code
        raw = response.read()
    print(f"{req.get_method()} {path}: HTTP {status} (esperado {expected})")
    if status != expected:
        raise RuntimeError("Resultado inesperado. Confira os logs da API no Render.")
    try:
        return json.loads(raw) if raw else None
    except (ValueError, UnicodeError):
        raise RuntimeError("A resposta não é JSON; confira se a URL aponta para a API.") from None


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", required=True, type=api_root)
    parser.add_argument(
        "--confirm-payment",
        action="store_true",
        help="Confirma e repete pagamento interno de pedido fictício; altera banco e matrícula.",
    )
    parser.add_argument("--order-id", type=int, help="ID positivo do pedido fictício pendente.")
    args = parser.parse_args(argv)
    if args.confirm_payment != (args.order_id is not None) or (
        args.order_id is not None and args.order_id <= 0
    ):
        parser.error("Para pagamento, informe --confirm-payment e --order-id positivo juntos.")

    opener = urllib.request.build_opener(NoRedirect)
    print(f"API: {args.api_url}")
    print("Verificações iniciais: somente leitura. Nenhum login ou cadastro é realizado.")
    live = request(opener, args.api_url, "/health/live", 200)
    ready = request(opener, args.api_url, "/health", 200)
    if live.get("status") != "alive" or ready.get("status") != "healthy":
        raise RuntimeError("Resposta de saúde inesperada.")
    request(opener, args.api_url, "/api/courses/catalog", 200)
    request(opener, args.api_url, "/api/Orders/my", 401)
    request(opener, args.api_url, "/api/courses", 401)
    if not args.confirm_payment:
        print("Verificações básicas aprovadas. Regras de negócio exigem o roteiro de homologação.")
        return 0

    print(f"\nSIMULAÇÃO: o pedido #{args.order_id} será marcado como pago pela API.")
    print("Isso pode criar matrícula e alterar dados. Use somente pedido fictício de teste.")
    confirmation = f"PAGAR TESTE {args.order_id}"
    if input(f"Digite {confirmation!r} para continuar: ") != confirmation:
        print("Simulação cancelada.")
        return 1
    secret = getpass.getpass("Payments__WebhookSecret da API (entrada oculta): ")
    if not secret.strip():
        raise RuntimeError("Segredo não informado.")

    # O teste negativo usa um ID que não corresponde a um pedido real.
    invalid = json.dumps({"EventId": "invalid-test", "OrderId": 0, "Status": "paid"}).encode()
    request(opener, args.api_url, "/api/payments/webhook", 401, invalid, "0" * 64)

    event_id = "render-test-" + str(uuid.uuid4())
    body = json.dumps(
        {
            "EventId": event_id,
            "PaymentId": event_id,
            "OrderId": args.order_id,
            "Status": "paid",
        },
        separators=(",", ":"),
    ).encode()
    signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    for attempt in range(2):
        result = request(opener, args.api_url, "/api/payments/webhook", 200, body, signature)
        if result.get("id") != args.order_id or result.get("paymentStatus") != "paid":
            raise RuntimeError("A API não retornou o pedido esperado como pago.")
        print("Confirmação aceita." if attempt == 0 else "Repetição do mesmo evento aceita.")
    print(f"Evento de teste: {event_id}")
    print("Confira no site a matrícula única e as vagas. Não houve cobrança em gateway.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, urllib.error.URLError, TimeoutError) as error:
        print(f"Falha: {error}", file=sys.stderr)
        sys.exit(1)
    except (KeyboardInterrupt, EOFError):
        print("\nOperação interrompida.", file=sys.stderr)
        sys.exit(1)
