{{/*
Expand the name of the chart.
*/}}
{{- define "taskmanager.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "taskmanager.fullname" -}}
{{- printf "%s" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "taskmanager.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "taskmanager.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "taskmanager.name" . }}-backend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "taskmanager.frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "taskmanager.name" . }}-frontend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Postgres selector labels
*/}}
{{- define "taskmanager.postgres.selectorLabels" -}}
app.kubernetes.io/name: {{ include "taskmanager.name" . }}-postgres
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
