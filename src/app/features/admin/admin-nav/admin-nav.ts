import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ADMIN_PATHS } from '../admin-constants';

@Component({
  selector: 'app-admin-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-nav.html',
})
export class AdminNav {
  protected readonly adminPaths = ADMIN_PATHS;
}
