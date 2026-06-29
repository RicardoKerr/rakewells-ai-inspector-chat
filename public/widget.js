(function () {
  var script = document.currentScript;
  if (!script) return;
  var widgetId = script.getAttribute('data-widget-id');
  if (!widgetId) { console.error('[HumanitoWidget] data-widget-id ausente'); return; }

  var origin = new URL(script.src).origin;
  var embedUrl = origin + '/embed/' + widgetId;

  // Container
  var container = document.createElement('div');
  container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;';

  // Iframe (hidden by default)
  var iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.allow = 'microphone;geolocation;clipboard-write';
  iframe.style.cssText = 'display:none;width:400px;height:600px;border:0;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.2);background:#fff;';

  // Floating button
  var btn = document.createElement('button');
  btn.setAttribute('aria-label', 'Abrir chat');
  btn.style.cssText = 'width:64px;height:64px;border-radius:50%;border:0;background:#2563eb;color:#fff;font-size:28px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);';
  btn.innerHTML = '💬';

  var open = false;
  btn.addEventListener('click', function () {
    open = !open;
    iframe.style.display = open ? 'block' : 'none';
    btn.style.display = open ? 'none' : 'block';
  });

  // Listen for close events from iframe (optional)
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'humanito:close') {
      open = false;
      iframe.style.display = 'none';
      btn.style.display = 'block';
    }
  });

  container.appendChild(iframe);
  container.appendChild(btn);
  document.body.appendChild(container);
})();