

import BubblesBackground from './BubblesBackground';
import theoryCards from '../../data/theoryCards.json';
import ScrollTypewriterText from './ScrollTypewriterText';

const theorySectionImages = [
  '/images/porous.jpg',
  '/images/finite-elements/v882-aew-41.jpg',
  '/images/foam.jpg',
];

export default function StartScreen({ onStart }) {
  return (
    <div className="bg-[var(--color-base-bg)] text-[var(--color-on-surface)] min-h-screen">
      <nav className="fixed top-0 w-full z-50 bg-slate-50/80 backdrop-blur-md border-b border-[var(--color-outline-variant)]/30">
        <div className="flex justify-between items-center h-16 px-6 md:px-8 max-w-7xl mx-auto w-full">
          <div className="text-xl font-black tracking-tighter text-slate-900 font-display uppercase">
            Foam Flow Local Equilibrium
          </div>
          <div className="hidden md:flex items-center space-x-10">
            <a className="text-cyan-600 font-bold border-b-2 border-cyan-500 pb-1 font-display text-sm uppercase tracking-wider" href="#hero">Simulation</a>
            <a className="text-slate-600 font-medium hover:text-cyan-500 transition-colors duration-200 font-display text-sm uppercase tracking-wider" href="#framework">Theory</a>
            <a className="text-slate-600 font-medium hover:text-cyan-500 transition-colors duration-200 font-display text-sm uppercase tracking-wider" href="#modules">About</a>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="bg-[var(--color-primary-container)] text-[var(--color-on-primary)] px-6 py-2 rounded font-display text-sm font-bold uppercase tracking-widest hover:bg-[var(--color-primary)] transition-colors duration-150 active:scale-95"
          >
            Simular
          </button>
        </div>
      </nav>

      <main className="pt-16 overflow-x-hidden">
        <section id="hero" className="relative min-h-[920px] flex flex-col items-center justify-center px-6 overflow-hidden">
          {/* Burbujas delante de la imagen del hero */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <BubblesBackground />
          </div>
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <img
              alt="Foam Flow Visualization"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLfg7UJ40cCJ4-8eLyyv4rJ-R4G35S4Q7iDfu2RJ_UHHV2qaa_UcuAcLB9vFpxqOkDCm-QnO7PvsZ8ngRG7f3vgkuw1iPFUs-hnGs9_IOKW0o-TrfU2Ngrhbhi5A7vnkLEyzQwClTN7OP06uOFrSb8_-Pf9E6Yj9hKn0ujd2gfA6AVMi5rWvOFxB7XHtNTlXoKmc0maRpSVXbNoYdj5VvBhAg-Cwxr9xc789KVuk880W6Manyfk8y3Eg6skgh5vfXxImG-CmWHDc7I"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-surface)]/20 via-[var(--color-surface)]/65 to-[var(--color-surface)]" />
          </div>
          <div className="relative z-10 max-w-4xl text-center">
            <div className="inline-flex items-center px-4 py-1 mb-8 rounded-full bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] font-display text-xs font-bold tracking-widest uppercase">
              Local Equilibrium Solver
            </div>
            <h1 className="font-display font-black text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.9] text-[var(--color-on-surface)] mb-6">
              Precision Simulation of <span className="text-[var(--color-primary)]">Foam Injection</span>
            </h1>
            <p className="font-sans text-xl md:text-2xl text-[var(--color-on-surface-variant)] max-w-2xl mx-auto mb-10 leading-relaxed">
              Advanced modeling of stratified porous media and multiphase fluid dynamics for EOR and CO2 storage studies.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={onStart}
                className="bg-[var(--color-primary-container)] text-[var(--color-on-primary)] px-10 py-5 rounded font-display text-lg font-black uppercase tracking-widest shadow-xl hover:shadow-cyan-500/20 transition-all active:scale-95"
              >
                Launch Simulator
              </button>
              <a
                href="#framework"
                className="glass-panel text-[var(--color-on-surface)] px-10 py-5 rounded font-display text-lg font-bold uppercase tracking-widest hover:bg-[var(--color-surface-container-high)] transition-all"
              >
                View Documentation
              </a>
            </div>
          </div>
        </section>

        <section id="framework" className="py-24 bg-[var(--color-surface-container-low)]">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <h2 className="font-display font-bold text-3xl mb-8 tracking-tight text-[var(--color-on-surface)] text-center">Theory</h2>
            <div className="w-full max-w-5xl mx-auto mb-20 space-y-8">
              {theoryCards.map((section, index) => (
                <section
                  key={section.title}
                  className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-outline-variant)]/40 shadow-sm p-7 md:p-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
                    <div className="md:col-span-4">
                      <img
                        src={theorySectionImages[index]}
                        alt={section.title}
                        className="w-full h-56 md:h-64 object-cover rounded-xl border border-[var(--color-outline-variant)]/40"
                      />
                    </div>
                    <div className="md:col-span-8">
                      <div className="font-display font-black text-xs tracking-[0.18em] uppercase text-[var(--color-primary)] mb-3">
                        Section {index + 1}
                      </div>
                      <h3 className="font-display font-bold text-2xl md:text-3xl tracking-tight text-[var(--color-on-surface)] mb-5">
                        {section.title}
                      </h3>
                      <ScrollTypewriterText
                        text={section.content}
                        importantTerms={section.importantTerms}
                        speed={10}
                        threshold={0.3}
                      />
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>



        <section id="modules" className="py-32 bg-[var(--color-surface)]">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center mb-20">
              <h2 className="font-display font-black text-4xl mb-4 text-[var(--color-on-surface)]">Simulator Engine Modules</h2>
              <p className="font-sans text-[var(--color-on-surface-variant)]">Brief reference of the parameters used by the simulator.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[var(--color-surface-container-low)] p-10 rounded-xl transition-all duration-300 hover:-translate-y-2 group">
                <div className="w-16 h-16 bg-[var(--color-surface-container)] rounded-lg mb-8 flex items-center justify-center group-hover:bg-[var(--color-primary-container)] transition-colors duration-300">
                  <span className="text-2xl text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-on-primary)]">#</span>
                </div>
                <h3 className="font-display font-bold text-2xl mb-4 text-[var(--color-on-surface)]">Geometry and Grid</h3>
                <p className="font-sans text-[var(--color-on-surface-variant)] leading-relaxed mb-6">
                  Defines domain and discretization: <strong>L</strong> (domain length), <strong>d</strong> (layer thickness), <strong>Nx</strong> and <strong>Nz</strong> (grid cells), and <strong>Tmax</strong> (total simulation time).
                </p>
                <div className="h-1 w-12 bg-[var(--color-outline-variant)]/30 group-hover:w-full group-hover:bg-[var(--color-primary)] transition-all duration-500" />
              </div>

              <div className="bg-[var(--color-surface-container-low)] p-10 rounded-xl transition-all duration-300 hover:-translate-y-2 group">
                <div className="w-16 h-16 bg-[var(--color-surface-container)] rounded-lg mb-8 flex items-center justify-center group-hover:bg-[var(--color-secondary)] transition-colors duration-300">
                  <span className="text-2xl text-[var(--color-on-surface-variant)] group-hover:text-white">~</span>
                </div>
                <h3 className="font-display font-bold text-2xl mb-4 text-[var(--color-on-surface)]">Layer and Flow Properties</h3>
                <p className="font-sans text-[var(--color-on-surface-variant)] leading-relaxed mb-6">
                  Controls porous layers and injection: <strong>phi1, phi2</strong> (porosity), <strong>k1, k2</strong> (permeability), and <strong>u1, u2</strong> (injection velocity in each layer).
                </p>
                <div className="h-1 w-12 bg-[var(--color-outline-variant)]/30 group-hover:w-full group-hover:bg-[var(--color-secondary)] transition-all duration-500" />
              </div>

              <div className="bg-[var(--color-surface-container-low)] p-10 rounded-xl transition-all duration-300 hover:-translate-y-2 group">
                <div className="w-16 h-16 bg-[var(--color-surface-container)] rounded-lg mb-8 flex items-center justify-center group-hover:bg-[var(--color-tertiary)]/25 transition-colors duration-300">
                  <span className="text-2xl text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-on-surface)]">o</span>
                </div>
                <h3 className="font-display font-bold text-2xl mb-4 text-[var(--color-on-surface)]">Saturation and Foam Physics</h3>
                <p className="font-sans text-[var(--color-on-surface-variant)] leading-relaxed mb-6">
                  Sets multiphase behavior: <strong>Sw_minus, Sw_plus, Swc, Sgr, Sw_star</strong> (saturation limits), <strong>mu_w, mu_g</strong> (viscosities), <strong>sigma, c_cap</strong> (capillarity), and <strong>A, Kc, theta_s</strong> (foam generation, coalescence, and trapping).
                </p>
                <div className="h-1 w-12 bg-[var(--color-outline-variant)]/30 group-hover:w-full group-hover:bg-[var(--color-tertiary)] transition-all duration-500" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 md:px-12">
          <div className="max-w-5xl mx-auto bg-[var(--color-on-surface)] rounded-3xl p-12 md:p-24 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/20 blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--color-secondary)]/10 blur-[100px]" />
            <h2 className="font-display font-black text-4xl md:text-5xl text-white mb-8 relative z-10">Ready to visualize the future of flow?</h2>
            <p className="text-slate-300 text-lg mb-12 max-w-xl mx-auto relative z-10">
              Launch the simulator and explore fronts, saturations, and recovery behavior with local-equilibrium foam physics.
            </p>
            <div className="relative z-10">
              <button
                type="button"
                onClick={onStart}
                className="bg-[var(--color-primary-container)] text-[var(--color-on-primary)] px-12 py-6 rounded font-display text-xl font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-[var(--color-primary)] transition-all active:scale-95"
              >
                Launch Simulator
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-100 w-full py-12 border-t border-[var(--color-outline-variant)]/30">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 max-w-7xl mx-auto gap-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="font-display font-black text-slate-900 text-xl tracking-tight mb-2 uppercase">Foam Flow Local Equilibrium</span>
            <p className="font-sans text-xs tracking-tight text-slate-500 uppercase">Pontificia Universidad Javeriana</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a className="text-slate-500 hover:text-slate-800 font-sans text-xs tracking-tight transition-opacity uppercase" href="#framework">Documentation</a>
            <a className="text-slate-500 hover:text-slate-800 font-sans text-xs tracking-tight transition-opacity uppercase" href="#">Privacy Policy</a>
            <a className="text-slate-500 hover:text-slate-800 font-sans text-xs tracking-tight transition-opacity uppercase" href="#">Contact Support</a>
            <a className="text-slate-500 hover:text-slate-800 font-sans text-xs tracking-tight transition-opacity uppercase" href="https://github.com/marco2712/Foam-flow-simulation2d" target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <p className="text-slate-500 font-sans text-xs tracking-tight text-center md:text-right">
            Copyright 2026 Andres Julian Castrillon & Marco Antonio Riascos
          </p>
        </div>
      </footer>
    </div>
  );
}
