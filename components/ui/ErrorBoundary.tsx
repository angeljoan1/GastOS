"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  label?: string
}

interface State {
  hasError: boolean
  message: string
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(`[ErrorBoundary:${this.props.label ?? "unknown"}]`, error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 px-6 py-10 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm text-zinc-400">
            {this.props.label
              ? `Error en ${this.props.label}.`
              : "Algo ha fallado."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="text-xs text-emerald-400 underline"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
