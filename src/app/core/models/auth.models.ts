export interface User {
    id: number;
    nome: string;
    email: string;
    cpf: string;
    phone: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    role: "Cliente" | "Admin";
}

export interface LoginRequest {
    email:string;
    senha: string;
}

export interface RegisterRequest{
    nome:string;
    email: string;
    senha: string;
    cpf: string;
    phone: string;
}

export interface UpdateProfileRequest {
    nome: string;
    email: string;
    cpf: string;
    phone: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
}
