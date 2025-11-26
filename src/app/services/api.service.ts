import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  status: string;
  pricing: string;
}

export interface ServiceRequest {
  id?: string;
  requestId?: string;
  serviceType: string;
  title: string;
  description: string;
  priority: string;
  environment: string;
  businessJustification: string;
  estimatedUsers: number;
  budget: number;
  requiredBy: string;
  technicalRequirements?: string;
  complianceRequirements?: string;
  contactEmail: string;
  department: string;
  status?: string;
  submittedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3001/api';
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  // Services
  getServices(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services`)
      .pipe(
        catchError(this.handleError<Service[]>('getServices', []))
      );
  }

  getService(id: string): Observable<Service> {
    return this.http.get<Service>(`${this.apiUrl}/services/${id}`)
      .pipe(
        catchError(this.handleError<Service>('getService'))
      );
  }

  // Service Requests
  getRequests(): Observable<ServiceRequest[]> {
    return this.http.get<ServiceRequest[]>(`${this.apiUrl}/requests`)
      .pipe(
        catchError(this.handleError<ServiceRequest[]>('getRequests', []))
      );
  }

  getRequest(id: string): Observable<ServiceRequest> {
    return this.http.get<ServiceRequest>(`${this.apiUrl}/requests/${id}`)
      .pipe(
        catchError(this.handleError<ServiceRequest>('getRequest'))
      );
  }

  createRequest(request: ServiceRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/requests`, request, this.httpOptions)
      .pipe(
        catchError(this.handleError<any>('createRequest'))
      );
  }

  updateRequest(id: string, request: Partial<ServiceRequest>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/requests/${id}`, request, this.httpOptions)
      .pipe(
        catchError(this.handleError<any>('updateRequest'))
      );
  }

  deleteRequest(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/requests/${id}`, this.httpOptions)
      .pipe(
        catchError(this.handleError<any>('deleteRequest'))
      );
  }

  // Users
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`)
      .pipe(
        catchError(this.handleError<User[]>('getUsers', []))
      );
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`)
      .pipe(
        catchError(this.handleError<User>('getUser'))
      );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`)
      .pipe(
        catchError(this.handleError<User>('getCurrentUser'))
      );
  }

  // Authentication
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, credentials, this.httpOptions)
      .pipe(
        catchError(this.handleError<any>('login'))
      );
  }

  register(userData: { name: string; email: string; password: string; department: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, userData, this.httpOptions)
      .pipe(
        catchError(this.handleError<any>('register'))
      );
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/logout`, {}, this.httpOptions)
      .pipe(
        catchError(this.handleError<any>('logout'))
      );
  }

  // Health check
  healthCheck(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/health`)
      .pipe(
        catchError(this.handleError<any>('healthCheck'))
      );
  }

  // Dashboard stats
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/stats`)
      .pipe(
        catchError(this.handleError<any>('getDashboardStats', {
          totalRequests: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          totalServices: 0
        }))
      );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }
}
