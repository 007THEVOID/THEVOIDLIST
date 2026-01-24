console.log("✅ Counter script loaded");

document.addEventListener("DOMContentLoaded", function () {

  console.log("✅ DOM fully loaded");

  const counters = document.querySelectorAll(".counter");
  const section = document.getElementById("section1");

  console.log("Section found:", section);
  console.log("Counters found:", counters.length);

  if (!section || counters.length === 0) {
    console.error("❌ Missing section or counters");
    return;
  }

  const duration = 2500;
  let animation = false;

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

function animate(counter) {
  const target = Number(counter.dataset.target);
  const suffix = counter.dataset.suffix || "";
  let start = null;

  function step(ts) {
    if (!start) start = ts;

    const progress = Math.min((ts - start) / duration, 1);
    const eased = easeOut(progress);
    const value = Math.floor(eased * target);

    counter.textContent = value.toLocaleString();

    // Always show suffix when animation is complete
    if (progress < 1) {
      counter.textContent = value.toLocaleString();
    } else {
      counter.textContent = target.toLocaleString() + suffix;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      console.log("Intersection:", entry.isIntersecting);

      if (entry.isIntersecting) {
        counters.forEach(counter => {
          counter.textContent = "0";
          animate(counter);
        });
      }
    });
  }, { threshold: 0.3 });

  observer.observe(section);

  let triggered = false;

window.addEventListener("scroll", () => {
  const section = document.getElementById("section1");
  const rect = section.getBoundingClientRect();

  if (rect.top < window.innerHeight && !triggered) {
    triggered = true;

    document.querySelectorAll(".counter").forEach(counter => {
      animate(counter);
    });
  }
});
});
