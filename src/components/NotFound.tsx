import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import { AlertCircle, Home } from 'lucide-react'

interface NotFoundProps {
  title?: string
  message?: string
}

export function NotFound({
  title = '404 - Not Found',
  message = "The page you're looking for doesn't exist.",
}: NotFoundProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-lg text-muted-foreground mb-8">{message}</p>
        <Link to="/">
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  )
}
