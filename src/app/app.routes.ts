import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ServiceCatalogComponent } from './components/service-catalog/service-catalog.component';
import { RequestFormComponent } from './components/request-form/request-form.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'services', component: ServiceCatalogComponent },
  { path: 'request/:serviceId', component: RequestFormComponent },
  { path: 'profile', component: UserProfileComponent },
  { path: '**', redirectTo: '/dashboard' }
];
