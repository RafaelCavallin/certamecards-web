import { Component } from '@angular/core';

@Component({
  selector: 'app-kbd',
  template: `<kbd
    class="inline-block min-w-[20px] rounded-sm border border-line px-[5px] text-center font-mono text-xs text-ink-faint"
    ><ng-content /></kbd
  >`,
})
export class Kbd {}
