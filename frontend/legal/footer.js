(() => {
  const mount = document.getElementById('shared-footer');
  if (!mount) return;
  mount.innerHTML = '<footer class="site-footer legal-site-footer"><div class="footer-watermark" aria-hidden="true">ANYAMA PROXY</div><div class="footer-main"><a class="brand" href="../" aria-label="Anyama Proxy accueil"><img class="footer-logo" src="../assets/anyama-proxy-logo-light.png" alt="ANYAMA PROXY"></a><p>Le savoir-faire local,<br>rendu visible.</p><div class="footer-contact"><strong>AKATech Studio</strong><span>Abidjan, Côte d’Ivoire</span><a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a><a href="tel:+2250142507750">+225 01 42 50 77 50</a><strong>For Tune Deal Multiservices</strong><span>Co-fondateur · <a href="tel:+2250173313068">+225 01 73 31 30 68</a></span></div><div class="footer-links"><a href="../#annuaire">Trouver un artisan <i data-lucide="arrow-up-right"></i></a><a href="../#inscription">Inscrire mon activité <i data-lucide="arrow-up-right"></i></a><a href="mentions-legales.html">Mentions légales</a><a href="politique-confidentialite.html">Confidentialité</a><a href="cgu.html">CGU</a></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Anyama Proxy</span><span class="footer-studio-credit"><a class="footer-studio-link" href="https://akatech.vercel.app/" target="_blank" rel="noreferrer"><b>AKATech Studio</b> · <b>For Tune Deal Multiservices</b>, co-fondateur</a> · <a href="tel:+2250173313068">+225 01 73 31 30 68</a></span><span>Anyama, Côte d’Ivoire</span></div></footer>';
  const icons = document.createElement('script');
  icons.src = 'https://unpkg.com/lucide@latest';
  icons.onload = () => window.lucide?.createIcons();
  document.body.appendChild(icons);
})();
