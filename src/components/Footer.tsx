import React from "react";
import { BrandLogo } from "./BrandLogo";

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}
      className="w-full border-t border-[#21262d] bg-[#0e1117] text-[#8b949e] pt-10 pb-12 sm:pb-16 mt-12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showText={true} showSubtitle={false} />
            <span className="text-xs text-[#8b949e] hidden sm:inline">
              — Portal Financeiro & Inteligência de Mercados Globais
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="hover:text-[#e6edf3] cursor-pointer">Termos de Uso</span>
            <span>•</span>
            <span className="hover:text-[#e6edf3] cursor-pointer">Privacidade & LGPD</span>
            <span>•</span>
            <span className="hover:text-[#e6edf3] cursor-pointer">Fontes de Dados</span>
            <span>•</span>
            <span className="hover:text-[#e6edf3] cursor-pointer">API de Cotações</span>
          </div>
        </div>

        {/* Disclaimer Text */}
        <div className="text-[11px] leading-relaxed text-[#8b949e]/80 border-t border-[#21262d] pt-4 space-y-1.5">
          <p>
            <strong className="text-[#8b949e]">Aviso Legal:</strong> As cotações e gráficos exibidos no portal DinhEuro.com são fornecidos para fins estritamente informativos e educacionais e não constituem recomendação de compra ou venda de quaisquer ativos, títulos ou contratos futuros. Dados de bolsas podem conter atrasos normativos de até 15 minutos dependendo da praça financeira. Criptoativos e Câmbio com transmissão 24/7.
          </p>
          <p>
            © {new Date().getFullYear()} DinhEuro.com. Todos os direitos reservados. Interface construída com padrão de alta densidade e modo escuro nativo (#0e1117).
          </p>
        </div>
      </div>
    </footer>
  );
};
