export function createThreePiecePieChart(size: number = 2) {
    const pieContainer = document.createElement('div');
    pieContainer.className = 'pie-container';
    pieContainer.style.position = 'relative';

    const pieChart = document.createElement('div');
    pieChart.style.position = 'relative';
    pieChart.style.width = `${size}em`;
    pieChart.style.height = `${size}em`;
    // pieChart.style.borderRadius = '50%';
    pieChart.style.overflow = 'hidden';

    const colors = ['#FF6347', '#3CB371', '#FFD700']; // Tomato, Medium Sea Green, Gold
    const angles = [120, 120, 120]; // 120 degrees each for three pieces
    const labels = ['Distribution', 'Networking', 'STATE VALIDATION'];

    let startAngle = 0;

    for (let i = 0; i < 3; i++) {
        const piece = document.createElement('div');
        piece.style.position = 'absolute';
        piece.style.width = '100%';
        piece.style.height = '100%';
        piece.style.clipPath = `polygon(50% 50%, ${50 + 50 * Math.cos(Math.PI * startAngle / 180)}% ${50 + 50 * Math.sin(Math.PI * startAngle / 180)}%, ${50 + 50 * Math.cos(Math.PI * (startAngle + angles[i]) / 180)}% ${50 + 50 * Math.sin(Math.PI * (startAngle + angles[i]) / 180)}%)`;
        piece.style.backgroundColor = colors[i];
        piece.style.transform = `rotate(${startAngle}deg)`;
        piece.style.transformOrigin = '50% 50%';

        pieChart.appendChild(piece);
        startAngle += angles[i];
    }

    const popup = document.createElement('div');
    popup.style.position = 'absolute'
    // popup.style.top = `${size}em`; // Position right below the pie chart
    popup.style.left = '3em';
    // popup.style.width = '300px'; // Width enough to fit pie chart and text
    // popup.style.height = '100px';
    popup.style.display = 'none'; // Initially hidden
    popup.style.backgroundColor = '#f9f9f9';
    popup.style.border = '1px solid #d3d3d3';
    popup.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    popup.style.padding = '10px';
    popup.style.borderRadius = '8px'
    popup.style.zIndex = '1000';

    const popupPieContainer = document.createElement('div')
    popupPieContainer.style.padding = '1em'

    const popupPieChart = pieChart.cloneNode(true) as HTMLElement;
    popupPieChart.style.width = `${size*3}em`;
    popupPieChart.style.height = `${size*3}em`;
    popupPieChart.style.position = 'relative'
    popupPieChart.style.float = 'left'
    popupPieChart.style.margin = '1em'
    popupPieContainer.appendChild(popupPieChart)

    const popupText = document.createElement('div');
    popupText.innerHTML = '<strong>Extra Information:</strong><br>Each slice represents a critical aspect of the system.';
    popupText.style.position = 'relative'
    popupPieChart.style.float = 'left'

    popup.appendChild(popupPieContainer);
    popup.appendChild(popupText);

     // Add labels around the popupPieChart
    const popupLabels = ['DISTRIBUTION', 'NETWORKING', 'WEB3'];
    const labelPositions = [
        { top: '22%', left: '40%', transform: 'rotate(30deg)' },
        { top: '48%', left: '40%', transform: 'rotate(-30deg)' },
        { top: '36%', left: '20%', transform: 'rotate(-90deg)' },
    ];

    popupLabels.forEach((text, index) => {
        const label = document.createElement('div');
        label.innerText = text;
        label.style.fontSize = '0.7em'
        label.style.position = 'absolute';
        label.style.whiteSpace = 'nowrap';
        Object.assign(label.style, labelPositions[index]);
        popupPieContainer.appendChild(label);
    });

    pieChart.addEventListener('mouseover', () => {
        popup.style.display = 'block';
    });

    pieChart.addEventListener('mouseout', () => {
        popup.style.display = 'none';
    });

    pieContainer.appendChild(pieChart);
    pieContainer.appendChild(popup);

    return pieContainer;
}
