import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, BarChart3, Menu, X } from 'lucide-react';
import { APP_LOGO_URL } from '../config/branding';

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
};

const Reveal = ({ children, delay = 0 }: RevealProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {children}
    </div>
  );
};

// Image hero optimisée (chargement lazy)
const heroImage =
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=75';

const keyPoints = [
  'Organisation des campagnes humanitaires et statistiques en un seul espace.',
  'Collaboration fluide entre équipes terrain et responsables de projets.',
  'Suivi fiable des données pour des décisions rapides et transparentes.',
];

const processSteps = [
  {
    title: 'Créer une campagne',
    description:
      'Le Project Manager définit les objectifs, formulaires et zones d’intervention en quelques clics.',
    icon: ClipboardList,
  },
  {
    title: 'Collecter sur le terrain',
    description:
      'Les enquêteurs accèdent aux missions, remplissent les formulaires et synchronisent les données en toute simplicité.',
    icon: Users,
  },
  {
    title: 'Analyser en temps réel',
    description:
      'Les équipes suivent l’avancement et prennent des décisions éclairées grâce à des tableaux de bord fiables.',
    icon: BarChart3,
  },
];

const profiles = [
  {
    title: 'Enquêteur',
    description:
      'Accédez aux campagnes, remplissez des formulaires intuitifs et partagez des données authentiques du terrain.',
    image:
      'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=600&q=75',
  },
  {
    title: 'Project Manager',
    description:
      'Planifiez, publiez et pilotez vos campagnes en gardant le contrôle sur chaque indicateur clé.',
    image:
      'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=600&q=75',
  },
  {
    title: 'Analyste',
    description:
      'Validez, analysez et transformez les données collectées en insights actionnables pour des décisions éclairées.',
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=75',
  },
];

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div id="top" className="min-h-screen bg-white text-slate-900">
      <header className="relative h-screen">
        <div
          className="absolute inset-0 bg-cover bg-center grayscale"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900/60" />

        <div className="relative z-10 flex h-full flex-col">
          <nav className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src={APP_LOGO_URL}
                alt="Fikiri Collect"
                className="h-10 w-auto sm:h-12 max-w-[120px] object-contain"
              />
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-widest text-white">Fikiri Collect</p>
                <p className="text-sm sm:text-lg font-semibold text-white">Données terrain fiables</p>
              </div>
            </div>
            
            {/* Menu Desktop */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6 text-sm uppercase tracking-wide text-white">
              <a href="#presentation" className="hover:text-blue-200 transition-colors">
                Présentation
              </a>
              <a href="#fonctionnement" className="hover:text-blue-200 transition-colors">
                Fonctionnement
              </a>
              <a href="#profils" className="hover:text-blue-200 transition-colors">
                Profils
              </a>
              <Link
                to="/login"
                className="rounded-full bg-white px-4 py-2 text-blue-600 font-semibold transition hover:bg-blue-50"
              >
                Se connecter
              </Link>
            </div>

            {/* Menu Mobile Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-white p-2"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </nav>

          {/* Menu Mobile */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-20 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-sm border-t border-white/10">
              <div className="flex flex-col px-6 py-4 gap-4">
                <a
                  href="#presentation"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white text-sm uppercase tracking-wide hover:text-blue-200 transition-colors py-2"
                >
                  Présentation
                </a>
                <a
                  href="#fonctionnement"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white text-sm uppercase tracking-wide hover:text-blue-200 transition-colors py-2"
                >
                  Fonctionnement
                </a>
                <a
                  href="#profils"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white text-sm uppercase tracking-wide hover:text-blue-200 transition-colors py-2"
                >
                  Profils
                </a>
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-full bg-white px-4 py-2 text-blue-600 font-semibold transition hover:bg-blue-50 text-center mt-2"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          )}

          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center lg:px-16">
            <Reveal>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.5em] text-blue-200">
                Plateforme humanitaire & statistique
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="max-w-4xl text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
                Collecter des données fiables pour un impact réel
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-6 max-w-3xl text-lg text-blue-100 sm:text-xl">
                Fikiri Collect met en lumière les réalités du terrain pour accélérer les décisions dans
                les projets humanitaires, les enquêtes sociales et les campagnes statistiques.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  to="/login"
                  className="rounded-full bg-blue-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-400"
                >
                  Voir les campagnes
                </Link>
                <Link
                  to="/project-manager-registration"
                  className="rounded-full border border-white/60 px-8 py-3 text-base font-semibold text-white transition hover:bg-white/10"
                >
                  Créer une campagne
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden bg-gradient-to-b from-blue-100 via-white to-blue-100 py-20">
        <div className="pointer-events-none absolute inset-y-[-10%] left-[-5%] hidden w-1/3 bg-gradient-to-b from-blue-300 via-blue-200 to-transparent opacity-80 blur-[110px] lg:block" />
        <div className="pointer-events-none absolute inset-y-[-10%] right-[-5%] hidden w-1/3 bg-gradient-to-b from-blue-200 via-blue-100 to-transparent opacity-80 blur-[110px] lg:block" />
        <div className="relative space-y-20">
        <section id="presentation" className="px-6 lg:px-16">
          <div className="mb-12 flex flex-col gap-4 text-center">
            <Reveal>
              <p className="text-sm uppercase tracking-[0.4em] text-blue-500">Présentation</p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                Fikiri Collect en toute simplicité
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mx-auto max-w-3xl text-base text-slate-600">
                Une plateforme unique pour préparer les campagnes, accompagner les équipes terrain et
                valoriser les données qui comptent vraiment pour les communautés.
              </p>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-100 bg-slate-50/80 p-8 text-left shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Pourquoi Fikiri Collect ?</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {keyPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        <section id="fonctionnement" className="px-6 lg:px-16">
          <div className="mb-12 flex flex-col gap-4 text-center">
            <Reveal>
              <p className="text-sm uppercase tracking-[0.4em] text-blue-500">Fonctionnement</p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                Trois étapes pour des données fiables
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mx-auto max-w-3xl text-base text-slate-600">
                Un parcours clair pour créer, collecter et analyser sans multiplier les outils.
              </p>
            </Reveal>
          </div>
          <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
            {processSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={index * 150}>
                  <div className="flex flex-col gap-5 rounded-[32px] border border-slate-100 bg-white/95 p-7 text-left shadow-2xl shadow-blue-100/60">
                    <div className="flex items-center gap-4 text-blue-600">
                      <div className="rounded-2xl bg-blue-50 p-3">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                        Étape {index + 1}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section id="profils" className="px-6 lg:px-16">
          <div className="mb-12 flex flex-col gap-4 text-center">
            <Reveal>
              <p className="text-sm uppercase tracking-[0.4em] text-blue-500">Profils</p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                Trois rôles complémentaires
              </h2>
            </Reveal>
          </div>
          <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-3">
            {profiles.map((role, index) => (
              <Reveal key={role.title} delay={index * 180}>
                <div className="overflow-hidden rounded-[36px] border border-slate-100 shadow-2xl shadow-blue-100/50">
                  <div
                    className="h-72 bg-cover bg-center"
                    style={{ backgroundImage: `url(${role.image})` }}
                  >
                    <div className="h-full w-full bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
                  </div>
                  <div className="space-y-4 p-8">
                    <h3 className="text-2xl font-semibold text-slate-900">{role.title}</h3>
                    <p className="text-slate-600">{role.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
        </div>
      </main>

      <footer className="border-t border-slate-100 bg-slate-50 px-6 py-12 text-center text-slate-600 lg:px-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              src={APP_LOGO_URL}
              alt="Fikiri Collect"
              className="h-12 w-auto max-w-[140px] object-contain"
            />
            <div className="text-left">
              <p className="text-xs uppercase tracking-widest text-blue-700">Fikiri Collect</p>
              <p className="text-lg font-semibold text-slate-900">Mission : données humaines, impact réel.</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Nous accompagnons les acteurs humanitaires et statistiques pour fiabiliser leurs décisions à partir de données terrain authentiques.
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-700">
              <a 
                href="#top" 
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-blue-600 transition-colors"
              >
                Accueil
              </a>
              <a href="#presentation" className="hover:text-blue-600 transition-colors">À propos</a>
              <a href="#profils" className="hover:text-blue-600 transition-colors">Contact</a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600">
              <a href="mailto:contact@fikiri.co" className="hover:text-blue-600 transition-colors">
                contact@fikiri.co
              </a>
              <span className="text-slate-400">•</span>
              <a href="tel:+243977246488" className="hover:text-blue-600 transition-colors">
                +243 977 246 488
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 text-xs uppercase tracking-[0.3em] text-slate-400">
          © {new Date().getFullYear()} Fikiri Collect — Tous droits réservés
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

