export interface Product {
    id: number;
    nome: string;
    preco: number;
    tipoProduto: 'equipment' | 'course';
    estoque: number;
    description: string;
    image: string;
    category: string;
    deliveryMode?: 'presencial' | 'ead';
    workloadHours?: number;
    date: string;
    location: string;
    instructor: string;
}

export interface ProductRequest {
    nome: string;
    preco: number;
    tipoProduto: 'equipment' | 'course';
    estoque: number;
    description: string;
    image: string;
    category: string;
    deliveryMode?: 'presencial' | 'ead';
    workloadHours?: number;
    date: string;
    location: string;
    instructor: string;
}
