import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Product, ProductRequest } from "../models/product.models";

const API_URL = 'http://localhost:5278/api';

@Injectable({providedIn: 'root'})
export class ProductService {
    private readonly http = inject(HttpClient);

    getAll(tipo?: 'equipment' | 'course'): Observable<Product[]> {
        const url = tipo ? `${API_URL}/Products?tipo=${tipo}` : `${API_URL}/Products`;
        return this.http.get<Product[]>(url);
    }

    getById(id: number): Observable<Product> {
        return this.http.get<Product>(`${API_URL}/Products/${id}`);
    }

    create(request: ProductRequest): Observable<Product> {
        return this.http.post<Product>(`${API_URL}/Products`, request);
    }

    update(id: number, request: ProductRequest): Observable<Product> {
        return this.http.put<Product>(`${API_URL}/Products/${id}`, request)
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${API_URL}/Products/${id}`)
    }
}