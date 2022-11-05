import '../styles/normalize.css';
import '../styles/main.css';
import '../styles/deckeditor.css';
import '../styles/faqs.css';
import '../styles/credits.css';
import '../styles/roboto.css';
import { boot } from '../services/boot.service';
import { React } from 'react';
import { useEffect } from 'react';
import { listen } from '../services/listener.service';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    boot();

    let toolTipData = '';

    function updateTooltip(event) {
      const tooltip = document.querySelector('#tooltip');
      tooltip.style.left = event.pageX + 'px';
      tooltip.style.top = event.pageY + 'px';

      tooltip.style.display = toolTipData ? 'block' : 'none';
      tooltip.innerHTML = toolTipData;
    }

    document.addEventListener('mousemove', updateTooltip, false);

    listen('TOOL_TIP', (action) => {
      toolTipData = action.data;
    });
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <div id="tooltip"></div>
    </>
  );
}

export default MyApp;
