import { EventEmitter } from 'events'

// Simple global event bus for server events (SSE broadcast)
export const events = new EventEmitter()

// Suggested events:
// - 'new_order' payload: { id, user_id, photo_id, quantity, created_at }
// - 'order_status' payload: { id, status, rider_id }

