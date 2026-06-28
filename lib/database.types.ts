export type CatStatus = 'spotted' | 'needs_foster' | 'adopted'
export type RequestStatus = 'pending' | 'connected' | 'adopted'

export type BadgeTier = 'Newcomer' | 'Scout' | 'Silver Scout' | 'Gold Scout'

export function getBadgeTier(score: number): BadgeTier {
  if (score >= 60) return 'Gold Scout'
  if (score >= 30) return 'Silver Scout'
  if (score >= 10) return 'Scout'
  return 'Newcomer'
}

export function blurCoordinates(lat: number, lng: number) {
  const blur = () => (Math.random() - 0.5) * 0.002
  return { lat: lat + blur(), lng: lng + blur() }
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          scout_score: number
          created_at: string
        }
        Insert: {
          id: string
          username: string
          scout_score?: number
          created_at?: string
        }
        Update: {
          username?: string
          scout_score?: number
        }
      }
      cats: {
        Row: {
          id: string
          name: string | null
          description: string
          status: CatStatus
          lat: number
          lng: number
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          description: string
          status?: CatStatus
          lat: number
          lng: number
          created_at?: string
        }
        Update: {
          name?: string | null
          description?: string
          status?: CatStatus
          lat?: number
          lng?: number
        }
      }
      sightings: {
        Row: {
          id: string
          cat_id: string
          photographer_id: string
          photo_url: string
          original_lat: number
          original_lng: number
          created_at: string
        }
        Insert: {
          id?: string
          cat_id: string
          photographer_id: string
          photo_url: string
          original_lat: number
          original_lng: number
          created_at?: string
        }
        Update: never
      }
      adoption_requests: {
        Row: {
          id: string
          cat_id: string
          requester_id: string
          photographer_id: string
          message: string
          status: RequestStatus
          created_at: string
        }
        Insert: {
          id?: string
          cat_id: string
          requester_id: string
          photographer_id: string
          message: string
          status?: RequestStatus
          created_at?: string
        }
        Update: {
          status?: RequestStatus
        }
      }
      messages: {
        Row: {
          id: string
          request_id: string
          sender_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          sender_id: string
          body: string
          created_at?: string
        }
        Update: never
      }
    }
  }
}
