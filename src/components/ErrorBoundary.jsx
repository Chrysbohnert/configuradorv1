import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Você pode registrar o erro em um serviço de logging
    console.error('❌ [ErrorBoundary] Erro capturado:', error);
    console.error('📋 [ErrorBoundary] Info do erro:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Aqui você pode enviar para um serviço de logging como Sentry
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Recarregar a página se necessário
    if (this.props.resetOnError) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // UI de fallback customizada
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px'
            }}>
              ⚠️
            </div>
            
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              Ops! Algo deu errado
            </h1>
            
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              Desculpe, encontramos um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver o problema.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                marginBottom: '24px',
                textAlign: 'left',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#dc2626',
                  marginBottom: '8px'
                }}>
                  Detalhes do erro (apenas em desenvolvimento)
                </summary>
                <pre style={{
                  fontSize: '12px',
                  color: '#991b1b',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5568d3'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#667eea'}
              >
                Tentar novamente
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                }}
              >
                Voltar ao início
              </button>
            </div>

            <p style={{
              fontSize: '14px',
              color: '#9ca3af',
              marginTop: '24px'
            }}>
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
