export interface CreateOrderItem {
    produtoId: number;
    quantidade: number;
}

export interface CreateOrderRequest {
    itens: CreateOrderItem[];
    valorFrete: number;
    paymentMethod: 'credit_card' | 'debit_card' | 'pix';
    installments?: number | null;
    promoCode: string;
}

export interface CreateOrderResponse {
    message: string;
    orderId: number;
    total: number;
}

export interface OrderItem {
    produtoId: number;
    nome: string;
    tipoProduto: 'equipment' | 'course';
    quantidade: number;
    precoUnitario: number;
    status?: string | null
}

export interface Order {
    id: number;
    dataPedido: string;
    status: string;
    paymentStatus?: string;
    gatewayPaymentId?: string | null;
    paidAt?: string | null;
    total: number;
    valorFrete: number;
    paymentMethod: string;
    installments?: number | null;
    promoCode: string;
    itens: OrderItem[];
}
