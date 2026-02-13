(function ($) {
  "use strict";

  var bootAttempts = 0;
  var maxBootAttempts = 30;

  function esc(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function previewByType(type) {
    if (type === "hero-split") {
      return '<div style="flex:1.5;background:#dfe5f5;border-radius:8px"></div><div style="flex:1;background:#c7d2f3;border-radius:8px"></div>';
    }
    if (type === "feature-grid") {
      return '<div style="flex:1;background:#dfe5f5;border-radius:8px"></div><div style="flex:1;background:#dfe5f5;border-radius:8px"></div><div style="flex:1;background:#dfe5f5;border-radius:8px"></div>';
    }
    return '<div style="flex:1;background:#dfe5f5;border-radius:8px"></div>';
  }

  function flattenElements(elements, out) {
    (elements || []).forEach(function (el) {
      if (!el || typeof el !== "object") return;
      out.push(el);
      if (Array.isArray(el.elements) && el.elements.length) {
        flattenElements(el.elements, out);
      }
    });
  }

  function textFromSettings(settings) {
    if (!settings || typeof settings !== "object") return "";
    return settings.title || settings.text || settings.editor || settings.description || "";
  }

  function prettyWidgetName(type) {
    return String(type || "widget")
      .replace("-", " ")
      .replace(/\b\w/g, function (m) {
        return m.toUpperCase();
      });
  }

  function buildVisualPreview(layoutData, visualType) {
    var all = [];
    flattenElements(layoutData, all);

    var widgets = all.filter(function (el) {
      return el && el.elType === "widget" && el.widgetType;
    });

    if (!widgets.length) {
      return previewByType(visualType);
    }

    return widgets
      .slice(0, 8)
      .map(function (w) {
        var label = prettyWidgetName(w.widgetType);
        var sample = textFromSettings(w.settings);
        var shortSample = sample ? String(sample).replace(/<[^>]+>/g, "").slice(0, 38) : "";
        return '<div style="flex:1;min-width:72px;background:#eef2ff;border:1px solid #d7defa;border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:4px">' +
          '<div style="font-size:10px;font-weight:700;color:#3f3f46;line-height:1.2">' + esc(label) + '</div>' +
          '<div style="height:4px;background:#c7d2fe;border-radius:8px"></div>' +
          '<div style="font-size:9px;color:#71717a;line-height:1.2">' + esc(shortSample || "preview") + '</div>' +
          '</div>';
      })
      .join("");
  }

  function closeModal() {
    $("#gec-modal").remove();
    $(document).off("keydown.gec");
  }

  function getTitle() {
    if (window.elementor && elementor.config && elementor.config.document && elementor.config.document.title) {
      return elementor.config.document.title;
    }
    return "Untitled";
  }

  function renderModal(data) {
    closeModal();

    var cards = (data.variations || [])
      .map(function (v, idx) {
        return '<div class="gec-card" data-idx="' + idx + '" tabindex="0" role="button" aria-label="Use ' + esc(v.name) + '">' +
          '<div class="gec-preview">' + buildVisualPreview(v.data, v.visual_type) + '</div>' +
          '<div class="gec-foot"><strong>' + esc(v.name) + '</strong><div><button>' + esc(gecVars.labels.useLayout) + '</button></div></div>' +
          '</div>';
      })
      .join("");

    var html = '' +
      '<div id="gec-modal" role="dialog" aria-modal="true" aria-label="AI Copilot Suggestions">' +
      '  <div class="gec-modal-body" tabindex="-1">' +
      '    <h2>✨ ' + esc(data.suggestion_title) + '</h2>' +
      '    <p>' + esc(data.reasoning) + '</p>' +
      '    <div class="gec-grid">' + cards + '</div>' +
      '    <button class="gec-close" type="button">' + esc(gecVars.labels.discard) + '</button>' +
      '  </div>' +
      '</div>';

    $("body").append(html);
    $(".gec-modal-body").trigger("focus");

    function apply(idx) {
      var layouts = data && data.variations && data.variations[idx] ? data.variations[idx].data : null;
      if (!Array.isArray(layouts) || !window.elementor || !window.$e) {
        alert("Could not apply layout.");
        return;
      }

      var doc = elementor.documents.getCurrent();
      layouts.forEach(function (item) {
        $e.run("document/elements/create", { container: doc.container, model: item });
      });

      closeModal();
    }

    $(".gec-card").on("click", function () {
      apply($(this).data("idx"));
    });

    $(".gec-card").on("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        apply($(this).data("idx"));
      }
    });

    $(".gec-close").on("click", closeModal);
    $(document).on("keydown.gec", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }


  function collectAvailableWidgets() {
    var found = {};

    function add(value) {
      var key = String(value || "").toLowerCase().replace(/[^a-z0-9_\-.]/g, "").replace(/\.default$/, "");
      if (!key) return;
      found[key] = true;
    }

    function walk(obj, depth) {
      if (!obj || depth > 4) return;
      if (Array.isArray(obj)) {
        obj.forEach(function (v) { walk(v, depth + 1); });
        return;
      }
      if (typeof obj !== "object") return;

      Object.keys(obj).forEach(function (k) {
        var v = obj[k];
        if (typeof v === "string") {
          if (/widget/i.test(k)) add(v);
        } else if (typeof v === "object") {
          walk(v, depth + 1);
        }
      });
    }

    try {
      if (window.elementor && elementor.config) {
        walk(elementor.config.widgets, 0);
        walk(elementor.config.elements, 0);
      }
      if (window.elementorCommon) {
        walk(elementorCommon.config, 0);
      }
    } catch (e) {
      // no-op
    }

    return Object.keys(found).slice(0, 200);
  }

  function requestLayouts($btn) {
    var count = 0;
    try {
      count = elementor.documents.getCurrent().container.children.length;
    } catch (e) {
      // no-op
    }

    $.ajax({
      method: "POST",
      url: gecVars.ajaxUrl,
      dataType: "json",
      timeout: 70000,
      data: {
        action: "gec_generate_layout",
        security: gecVars.nonce,
        title: getTitle(),
        context: "Existing elements: " + count,
        available_widgets: collectAvailableWidgets(),
      },
    })
      .done(function (res) {
        if (res && res.success && res.data) {
          renderModal(res.data);
        } else {
          alert((res && res.data) || "Generation failed.");
        }
      })
      .fail(function (xhr) {
        var msg = xhr && xhr.responseJSON && xhr.responseJSON.data ? xhr.responseJSON.data : "Network error. Please try again.";
        alert(msg);
      })
      .always(function () {
        $btn.prop("disabled", false).html('<i class="eicon-ai"></i> ' + esc(gecVars.labels.copilot));
      });
  }

  function injectButton() {
    if (!window.gecVars || !window.elementor) {
      return false;
    }

    if ($("#gec-trigger").length) {
      return true;
    }

    var $btn = $('<button id="gec-trigger" type="button"><i class="eicon-ai"></i> ' + esc(gecVars.labels.copilot) + '</button>');
    $("body").append($btn);

    $btn.on("click", function () {
      var $this = $(this);
      if ($this.prop("disabled")) return;
      $this.prop("disabled", true).html('<i class="eicon-loading eicon-animation-spin"></i> ' + esc(gecVars.labels.loading));
      requestLayouts($this);
    });

    return true;
  }

  function bootCopilot() {
    if (injectButton()) {
      return;
    }

    bootAttempts += 1;
    if (bootAttempts >= maxBootAttempts) {
      return;
    }

    setTimeout(bootCopilot, 1000);
  }

  $(document).ready(function () {
    bootCopilot();
  });

  $(window).on("elementor:init", function () {
    bootCopilot();
  });
})(jQuery);
