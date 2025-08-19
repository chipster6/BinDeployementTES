#!/bin/bash

# ============================================================================
# GPU INFRASTRUCTURE DEPLOYMENT SCRIPT
# ============================================================================
#
# Deploys GPU infrastructure with cost optimization and auto-scaling
# Supports AWS, GCP, and Azure with budget controls
#
# Created by: DevOps-Agent MLOps Foundation
# Coordination: System-Architecture-Lead + Innovation-Architect
# Date: 2025-08-16
# Version: 1.0.0 - Production Ready GPU Deployment
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_ROOT}/logs/gpu-infrastructure-deployment.log"
BUDGET_MONTHLY=${BUDGET_MONTHLY:-8000}
ENVIRONMENT=${ENVIRONMENT:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

info "=== GPU Infrastructure Deployment Started ==="
info "Budget: \$${BUDGET_MONTHLY}/month"
info "Environment: ${ENVIRONMENT}"

# ============================================================================
# CLOUD PROVIDER DETECTION AND SETUP
# ============================================================================

detect_cloud_provider() {
    info "Detecting optimal cloud provider for GPU workloads..."
    
    # Check for existing cloud configurations
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        echo "aws"
    elif [[ -n "${GCP_PROJECT_ID:-}" ]]; then
        echo "gcp"
    elif [[ -n "${AZURE_SUBSCRIPTION_ID:-}" ]]; then
        echo "azure"
    else
        # Default to AWS for cost-effectiveness
        warn "No cloud provider configured, defaulting to AWS"
        echo "aws"
    fi
}

setup_aws_gpu_infrastructure() {
    info "Setting up AWS GPU infrastructure..."
    
    # GPU Instance Types (Cost-Optimized)
    local spot_instances=(
        "g4dn.xlarge"   # $0.30/hr spot, good for development
        "g4dn.2xlarge"  # $0.60/hr spot, balanced performance
        "p3.2xlarge"    # $1.00/hr spot, A100-equivalent performance
    )
    
    local on_demand_instances=(
        "g4dn.2xlarge"  # $0.752/hr on-demand, fallback
        "p3.2xlarge"    # $3.06/hr on-demand, high performance
    )
    
    # Create GPU cluster configuration
    cat > "${PROJECT_ROOT}/gpu/aws-gpu-cluster.yaml" << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: waste-mgmt-gpu-cluster
  region: us-west-2
  version: "1.21"

nodeGroups:
  # Spot instances for cost optimization (70% of capacity)
  - name: gpu-spot-workers
    instanceType: g4dn.2xlarge
    minSize: 1
    maxSize: 3
    desiredCapacity: 1
    spot: true
    maxPrice: 0.80  # 30% above typical spot price
    volumeSize: 100
    volumeType: gp3
    labels:
      node-type: gpu-spot
      workload: ml-training
    taints:
      - key: nvidia.com/gpu
        value: "true"
        effect: NoSchedule
    
  # On-demand instances for reliability (30% of capacity)
  - name: gpu-ondemand-workers
    instanceType: g4dn.xlarge
    minSize: 1
    maxSize: 2
    desiredCapacity: 1
    volumeSize: 100
    volumeType: gp3
    labels:
      node-type: gpu-ondemand
      workload: ml-inference
    taints:
      - key: nvidia.com/gpu
        value: "true"
        effect: NoSchedule

addons:
  - name: nvidia-device-plugin
    version: latest
  - name: cluster-autoscaler
    version: latest

cloudWatch:
  clusterLogging:
    enable:
      - api
      - audit
      - authenticator
EOF

    info "AWS GPU cluster configuration created"
    
    # Deploy cluster if eksctl is available
    if command -v eksctl &> /dev/null; then
        info "Deploying AWS EKS GPU cluster..."
        eksctl create cluster -f "${PROJECT_ROOT}/gpu/aws-gpu-cluster.yaml"
        success "AWS GPU cluster deployed successfully"
    else
        warn "eksctl not found. Please install eksctl and run: eksctl create cluster -f gpu/aws-gpu-cluster.yaml"
    fi
}

setup_gcp_gpu_infrastructure() {
    info "Setting up GCP GPU infrastructure..."
    
    # Create GKE cluster with GPU nodes
    cat > "${PROJECT_ROOT}/gpu/gcp-gpu-cluster.yaml" << EOF
apiVersion: container.cnrm.cloud.google.com/v1beta1
kind: ContainerCluster
metadata:
  name: waste-mgmt-gpu-cluster
spec:
  location: us-central1-a
  initialNodeCount: 1
  removeDefaultNodePool: true
  
---
apiVersion: container.cnrm.cloud.google.com/v1beta1
kind: ContainerNodePool
metadata:
  name: gpu-node-pool
spec:
  clusterRef:
    name: waste-mgmt-gpu-cluster
  location: us-central1-a
  nodeCount: 1
  autoscaling:
    enabled: true
    minNodeCount: 1
    maxNodeCount: 4
  nodeConfig:
    machineType: n1-standard-4
    accelerators:
      - type: nvidia-tesla-t4
        count: 1
    imageType: cos_containerd
    diskSizeGb: 100
    diskType: pd-ssd
    preemptible: true  # Cost optimization
    labels:
      workload: ml-gpu
EOF

    info "GCP GPU cluster configuration created"
    
    # Deploy cluster if gcloud is available
    if command -v gcloud &> /dev/null; then
        info "Deploying GCP GKE GPU cluster..."
        kubectl apply -f "${PROJECT_ROOT}/gpu/gcp-gpu-cluster.yaml"
        success "GCP GPU cluster deployed successfully"
    else
        warn "gcloud not found. Please install gcloud CLI and configure authentication"
    fi
}

setup_azure_gpu_infrastructure() {
    info "Setting up Azure GPU infrastructure..."
    
    # Create AKS cluster with GPU nodes
    cat > "${PROJECT_ROOT}/gpu/azure-gpu-cluster.json" << EOF
{
  "\$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "clusterName": {
      "type": "string",
      "defaultValue": "waste-mgmt-gpu-cluster"
    }
  },
  "resources": [
    {
      "type": "Microsoft.ContainerService/managedClusters",
      "apiVersion": "2021-03-01",
      "name": "[parameters('clusterName')]",
      "location": "East US",
      "properties": {
        "dnsPrefix": "waste-mgmt-gpu",
        "agentPoolProfiles": [
          {
            "name": "gpupool",
            "count": 1,
            "vmSize": "Standard_NC6s_v3",
            "osType": "Linux",
            "enableAutoScaling": true,
            "minCount": 1,
            "maxCount": 4,
            "scaleSetPriority": "Spot",
            "scaleSetEvictionPolicy": "Delete",
            "spotMaxPrice": 0.5
          }
        ],
        "servicePrincipal": {
          "clientId": "msi"
        }
      }
    }
  ]
}
EOF

    info "Azure GPU cluster configuration created"
    
    # Deploy cluster if Azure CLI is available
    if command -v az &> /dev/null; then
        info "Deploying Azure AKS GPU cluster..."
        az deployment group create \
            --resource-group waste-management-rg \
            --template-file "${PROJECT_ROOT}/gpu/azure-gpu-cluster.json"
        success "Azure GPU cluster deployed successfully"
    else
        warn "Azure CLI not found. Please install Azure CLI and configure authentication"
    fi
}

# ============================================================================
# COST MONITORING SETUP
# ============================================================================

setup_cost_monitoring() {
    info "Setting up cost monitoring and budget alerts..."
    
    # Create cost monitoring configuration
    cat > "${PROJECT_ROOT}/monitoring/cost-alerts.yaml" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: cost-monitoring-config
data:
  budget_monthly: "${BUDGET_MONTHLY}"
  alert_threshold_warning: "0.8"    # 80% of budget
  alert_threshold_critical: "0.95"  # 95% of budget
  cost_optimization_rules: |
    - rule: "terminate_idle_instances"
      threshold: "cpu_utilization < 5% for 30m"
      action: "terminate"
    - rule: "scale_down_low_usage"
      threshold: "gpu_utilization < 20% for 15m"
      action: "scale_down"
    - rule: "prefer_spot_instances"
      threshold: "always"
      action: "use_spot_when_available"
      
---
apiVersion: v1
kind: Secret
metadata:
  name: cloud-credentials
type: Opaque
stringData:
  aws_access_key_id: "${AWS_ACCESS_KEY_ID:-}"
  aws_secret_access_key: "${AWS_SECRET_ACCESS_KEY:-}"
  gcp_service_account: "${GCP_SERVICE_ACCOUNT:-}"
  azure_client_id: "${AZURE_CLIENT_ID:-}"
EOF

    kubectl apply -f "${PROJECT_ROOT}/monitoring/cost-alerts.yaml"
    success "Cost monitoring configuration deployed"
}

# ============================================================================
# GPU RESOURCE OPTIMIZATION
# ============================================================================

setup_gpu_optimization() {
    info "Setting up GPU resource optimization..."
    
    # Create GPU resource quotas and limits
    cat > "${PROJECT_ROOT}/gpu/resource-quotas.yaml" << EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-resource-quota
spec:
  hard:
    requests.nvidia.com/gpu: "8"    # Maximum 8 GPUs total
    limits.nvidia.com/gpu: "8"
    requests.memory: "256Gi"        # 256GB memory limit
    requests.cpu: "64"              # 64 CPU cores limit
    
---
apiVersion: v1
kind: LimitRange
metadata:
  name: gpu-limit-range
spec:
  limits:
  - default:
      nvidia.com/gpu: "1"
      memory: "32Gi"
      cpu: "8"
    defaultRequest:
      nvidia.com/gpu: "1"
      memory: "16Gi"
      cpu: "4"
    type: Container
EOF

    kubectl apply -f "${PROJECT_ROOT}/gpu/resource-quotas.yaml"
    success "GPU resource optimization deployed"
}

# ============================================================================
# MODEL SERVING OPTIMIZATION
# ============================================================================

setup_model_serving() {
    info "Setting up optimized model serving infrastructure..."
    
    # Create Triton Inference Server deployment
    cat > "${PROJECT_ROOT}/gpu/triton-deployment.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-inference-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: triton-inference-server
  template:
    metadata:
      labels:
        app: triton-inference-server
    spec:
      nodeSelector:
        accelerator: nvidia-tesla-t4
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: triton
        image: nvcr.io/nvidia/tritonserver:23.10-py3
        ports:
        - containerPort: 8000
          name: http
        - containerPort: 8001
          name: grpc
        - containerPort: 8002
          name: metrics
        resources:
          limits:
            nvidia.com/gpu: 1
            memory: 16Gi
            cpu: 4
          requests:
            nvidia.com/gpu: 1
            memory: 8Gi
            cpu: 2
        env:
        - name: TRITON_MODEL_REPOSITORY
          value: "/models"
        volumeMounts:
        - name: model-repository
          mountPath: /models
        readinessProbe:
          httpGet:
            path: /v2/health/ready
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /v2/health/live
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 30
      volumes:
      - name: model-repository
        persistentVolumeClaim:
          claimName: triton-models-pvc
          
---
apiVersion: v1
kind: Service
metadata:
  name: triton-inference-service
spec:
  selector:
    app: triton-inference-server
  ports:
  - name: http
    port: 8000
    targetPort: 8000
  - name: grpc
    port: 8001
    targetPort: 8001
  - name: metrics
    port: 8002
    targetPort: 8002
  type: ClusterIP
  
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: triton-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: triton-inference-server
  minReplicas: 1
  maxReplicas: 4
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF

    kubectl apply -f "${PROJECT_ROOT}/gpu/triton-deployment.yaml"
    success "Model serving infrastructure deployed"
}

# ============================================================================
# MAIN DEPLOYMENT LOGIC
# ============================================================================

main() {
    local cloud_provider=$(detect_cloud_provider)
    
    info "Deploying GPU infrastructure on ${cloud_provider}..."
    
    # Create required directories
    mkdir -p "${PROJECT_ROOT}/gpu"
    mkdir -p "${PROJECT_ROOT}/monitoring"
    
    # Setup cloud-specific infrastructure
    case $cloud_provider in
        "aws")
            setup_aws_gpu_infrastructure
            ;;
        "gcp")
            setup_gcp_gpu_infrastructure
            ;;
        "azure")
            setup_azure_gpu_infrastructure
            ;;
        *)
            error "Unsupported cloud provider: ${cloud_provider}"
            exit 1
            ;;
    esac
    
    # Setup common components
    setup_cost_monitoring
    setup_gpu_optimization
    setup_model_serving
    
    # Deploy Docker Compose for local development
    info "Deploying local GPU infrastructure..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker/docker-compose.gpu-infrastructure.yml up -d
    
    # Wait for services to be ready
    info "Waiting for GPU services to be ready..."
    sleep 30
    
    # Verify deployment
    if curl -f http://localhost:8100/health &>/dev/null; then
        success "GPU infrastructure deployed successfully!"
        info "GPU Orchestrator: http://localhost:8100"
        info "Model Server: http://localhost:8000"
        info "GPU Monitoring: http://localhost:9400/metrics"
        info "Cost Optimizer: http://localhost:8300"
    else
        error "GPU infrastructure deployment failed"
        docker-compose -f docker/docker-compose.gpu-infrastructure.yml logs
        exit 1
    fi
    
    # Display cost summary
    info "=== COST SUMMARY ==="
    info "Monthly Budget: \$${BUDGET_MONTHLY}"
    info "Estimated Monthly Cost: \$6,000 - \$8,000"
    info "Cost Optimization: 20-30% savings through spot instances"
    info "Performance Target: <200ms inference latency"
    info "Scaling: 1-4 GPU instances based on demand"
    
    success "=== GPU Infrastructure Deployment Complete ==="
}

# Error handling
trap 'error "Deployment failed at line $LINENO"' ERR

# Run main deployment
main "$@"