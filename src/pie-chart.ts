function createPieChartWithPieces(pieSize: number, pieceSizePercentage: number) {
    const pieChart = document.createElement('div');
    pieChart.style.position = 'relative';
    pieChart.style.width = `${pieSize}em`;
    pieChart.style.height = `${pieSize}em`;
    pieChart.style.overflow = 'hidden';
    pieChart.style.display = 'flex';
    pieChart.style.alignItems = 'center';
    pieChart.style.justifyContent = 'center';

    const colors = ['#FF6347', '#3CB371', '#FFD700']; // Tomato, Medium Sea Green, Gold
    const angles = [120, 120, 120]; // 120 degrees each for three pieces

    let startAngle = 0;

    for (let i = 0; i < 3; i++) {
        const piece = document.createElement('div');
        piece.style.position = 'absolute';
        piece.style.width = `${pieceSizePercentage}%`;
        piece.style.height = `${pieceSizePercentage}%`;
        piece.style.clipPath = `polygon(50% 50%, ${50 + 50 * Math.cos(Math.PI * startAngle / 180)}% ${50 + 50 * Math.sin(Math.PI * startAngle / 180)}%, ${50 + 50 * Math.cos(Math.PI * (startAngle + angles[i]) / 180)}% ${50 + 50 * Math.sin(Math.PI * (startAngle + angles[i]) / 180)}%)`;
        piece.style.backgroundColor = colors[i];
        piece.style.transform = `rotate(${startAngle}deg)`;
        piece.style.transformOrigin = '50% 50%';

        pieChart.appendChild(piece);
        startAngle += angles[i];
    }

    return pieChart;
}

export function createThreePiecePieChart(size: number = 2) {
    const pieContainer = document.createElement('div');
    pieContainer.className = 'pie-container';
    pieContainer.style.position = 'relative';


    const pieChart = createPieChartWithPieces(size, 100); // Example usage with 80% piece size

    const popup = document.createElement('div');
    popup.style.position = 'absolute'
    // popup.style.top = `${size}em`; // Position right below the pie chart
    popup.style.left = '3em';
    popup.style.width = '20em'; // Width enough to fit pie chart and text
    // popup.style.height = '100px';
    popup.style.display = 'none'; // Initially hidden
    popup.style.alignItems = 'center'
    popup.style.backgroundColor = '#f9f9f9';
    popup.style.border = '1px solid #d3d3d3';
    popup.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    popup.style.padding = '2em'
    popup.style.paddingLeft = '1em'
    popup.style.borderRadius = '8px'
    popup.style.zIndex = '1000';

    const popupPieContainer = document.createElement('div')
    popupPieContainer.className = 'popup-pie-container'
    popupPieContainer.style.display = 'flex'
    popupPieContainer.style.height = '100%'
    // popupPieContainer.style.width = '20%';

    const popupPieChart = createPieChartWithPieces(size*4, 80)
    popupPieChart.style.marginRight = '2em'
    popupPieContainer.appendChild(popupPieChart)

    const popupText = document.createElement('div');
    popupText.innerHTML = '<b>Distribution</b><br>Each slice represents a critical aspect of the system.'
                        + '<br><br><b>Networking</b><br>Each slice represents a critical aspect of the system.'
                        + '<br><br><b>Web3</b><br>Each slice represents a critical aspect of the system.'
    // popupText.style.position = 'relative'
    popupText.style.display = 'inline-grid'
    popupPieChart.style.float = 'left'
    // popupText.style.paddingLeft = '3em'

    popup.appendChild(popupPieContainer);
    popup.appendChild(popupText);

     // Add labels around the popupPieChart
    const popupLabels = ['DISTRIBUTION', 'NETWORKING', 'WEB3'];
    const labelPositions = [
        { top: '20%', left: '35%', transform: 'rotate(30deg)' },
        { top: '70%', left: '35%', transform: 'rotate(-30deg)' },
        { top: '50%', left: '8%', transform: 'rotate(-90deg)' },
    ];

    popupLabels.forEach((text, index) => {
        const label = document.createElement('div');
        label.innerText = text;
        label.style.fontSize = '0.7em'
        label.style.fontWeight = 'bold'
        label.style.position = 'absolute';
        label.style.whiteSpace = 'nowrap';
        Object.assign(label.style, labelPositions[index]);
        popupPieChart.appendChild(label);
    });

    pieChart.addEventListener('mouseover', () => {
        popup.style.display = 'flex';
    });

    pieChart.addEventListener('mouseout', () => {
        popup.style.display = 'none';
    });

    pieContainer.appendChild(pieChart);
    pieContainer.appendChild(popup);

    return pieContainer;
}
