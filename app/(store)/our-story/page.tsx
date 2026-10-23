import Link from 'next/link';
import { ArrowUpRight, Heart, Leaf, ShieldCheck } from 'lucide-react';
import { PageHero } from '@/components/page-hero';
import { Lines, Marquee, ScrubWords, Seal } from '@/components/motion';

export const metadata = { title: 'Our story' };

const gallery = [
  { image: 'sweets', name: 'Sweet celebrations', category: 'Sweets' },
  { image: 'snacks', name: 'Everyday little joys', category: 'Snacks' },
  { image: 'spices', name: 'A spoonful of home', category: 'Pantry' },
];

const values = [
  { Icon: Leaf, title: '100% natural', text: 'Pure goodness without artificial additives.' },
  { Icon: ShieldCheck, title: 'Chemical-free', text: 'No harmful chemicals or preservatives.' },
  { Icon: Heart, title: 'Made with love', text: 'Traditional recipes from our home to yours.' },
];

export default function Story() {
  return (
    <>
      <PageHero
        kicker="The heart behind the homemade"
        lines={['It starts with food.', 'It stays as', <em key="e">a feeling.</em>]}
        text="The familiar aroma. That first bite. The feeling of being home."
      >
        <div className="sw-portrait" data-reveal="scale">
          <div className="sw-story-ring" aria-hidden="true" />
          <Seal className="sw-story-seal" text="A FAMILY KITCHEN ✦ A SHARED LOVE ✦ " />
          <div className="sw-story-medallion">
            <img src="/family-logo.png" alt="The mother and daughter spirit of Swaadha" />
          </div>
        </div>
      </PageHero>

      <section className="sw-section sw-story-text">
        <div className="sw-story-cols">
          <span className="sw-dropcap" data-reveal="scale" aria-hidden="true">
            S
          </span>
          <div data-stagger>
            <p data-reveal="up">
              At Swaadha, our story begins with a simple thought: the food we share should carry the same care as the food we make
              for our own family.
            </p>
            <p data-reveal="up">
              We celebrate authentic flavors and traditional recipes, with fresh ingredients and the attention that only small
              batches can offer. From an everyday meal to a festive gathering, we want to bring a little warmth to your table.
            </p>
            <Link className="sw-btn is-red" href="/products" data-reveal="up" data-magnetic>
              <span>Find your taste of home</span>
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <div className="sw-strip">
        <Marquee items={['Familiar flavors', 'Thoughtfully shared', 'Small batches', 'Family recipes', 'Made with love']} />
      </div>

      <section className="sw-section sw-gallery">
        <div className="sw-head is-center">
          <span className="sw-kicker" data-reveal="fade">
            From the Swaadha kitchen
          </span>
          <Lines lines={['Our story,', <em key="e">served with love.</em>]} />
        </div>
        <div className="sw-gallery-grid" data-stagger>
          {gallery.map((item) => (
            <Link href={`/products?category=${item.category}`} key={item.image} className="sw-craving" data-reveal="clip">
              <span className="sw-craving-img">
                <img src={`/images/banner-${item.image}.jpg`} alt="" loading="lazy" />
              </span>
              <span className="sw-craving-copy">
                <small>{item.category}</small>
                <b>{item.name}</b>
              </span>
              <span className="sw-craving-arrow">
                <ArrowUpRight size={20} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sw-quote">
        <div className="sw-grain" />
        <span className="sw-quote-mark" aria-hidden="true">
          &ldquo;
        </span>
        <ScrubWords className="is-light" text="The best ingredient? The care you put into it." />
        <p className="sw-kicker is-light">The Swaadha way</p>
      </section>

      <section className="sw-section sw-vows">
        <div className="sw-head is-center">
          <span className="sw-kicker" data-reveal="fade">
            Our kitchen promise
          </span>
          <Lines lines={['Simple ingredients.', <em key="e">Honest goodness.</em>]} />
        </div>
        <div className="sw-vow-grid" data-stagger>
          {values.map(({ Icon, title, text }) => (
            <article key={title} className="sw-vow" data-reveal="up">
              <div className="sw-vow-seal">
                <Icon size={28} strokeWidth={1.3} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
