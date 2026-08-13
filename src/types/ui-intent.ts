export type UIIntentType =
  | 'show_result_panel'
  | 'show_context_snapshot';

export interface UIIntentAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface UIIntent {
  id: string;
  type: UIIntentType;
  title?: string;
  description?: string;
  payload: Record<string, unknown>;
  actions?: UIIntentAction[];
  createdAt?: string;
}
